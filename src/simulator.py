import pandas as pd
import duckdb

import numpy as np
import time
import queue
import threading
from collections import deque, defaultdict
import pickle

# required pre-clean data for simulation
# Remove if: trip_distance <= 0        (physically impossible)
# Remove if: fare_amount is NULL       (can't compute fare metrics)
# Remove if: pickup_hour is NULL       (can't assign to time bucket)
# Remove if: PULocationID is NULL      (can't assign to zone)

DB_PATH = "../data/aidqds.db"
FILE_PATH = "../data/test/yellow_tripdata_2025-07.parquet"
BASELINE_PATH = "../data/processed/baseline.pkl"

july_trips = pd.read_parquet(FILE_PATH)

con = duckdb.connect(DB_PATH)
con.execute(""" DROP TABLE IF EXISTS july_trips """) # ensure clean slate for simulation

with open(BASELINE_PATH,"rb") as f:
    baseline_raw = pickle.load(f)
    # restore deque structure
    baseline = defaultdict(lambda: deque(maxlen=25))
    for k,v in baseline_raw.items():
        baseline[k] = deque(v, maxlen=25)

con.execute("""CREATE TABLE if not exists july_trips AS
            SELECT *,
            (trip_distance * 3600) / trip_duration_sec AS speed_mph
            
            FROM (
            SELECT 
            CAST(tpep_pickup_datetime AS TIMESTAMP) AS pickup_datetime,
            CAST(tpep_dropoff_datetime AS TIMESTAMP) AS dropoff_datetime,
            DAYOFWEEK(pickup_datetime) AS day_of_week,
            DATE_TRUNC('hour', pickup_datetime) AS pickup_hour,
            DATE_TRUNC('hour', dropoff_datetime) AS dropoff_hour,
            EXTRACT(EPOCH FROM (dropoff_datetime - pickup_datetime)) AS trip_duration_sec,
            PULocationID,
            DOLocationID,
            fare_amount,
            trip_distance,
            passenger_count,
            payment_type
            from read_parquet('../data/test/yellow_tripdata_2025-07.parquet')
                WHERE trip_distance > 0
                    AND fare_amount IS NOT NULL
                    AND pickup_datetime IS NOT NULL
                    AND PULocationID IS NOT NULL
                    AND pickup_datetime >= '2025-07-01 00:00:00'
                    AND pickup_datetime < '2025-08-01 00:00:00'
            )
            where trip_duration_sec > 0
            """)

unique_hours = con.execute(""" SELECT Distinct pickup_hour from july_trips order by pickup_hour""").df()['pickup_hour'].tolist()
# print(f"Unique hours in July: {len(unique_hours)}")
# print(f"First: {unique_hours[0]}")
# print(f"Last:  {unique_hours[-1]}")
# Output:
# Unique hours in July: 744
# First: 2025-07-01 00:00:00
# Last:  2025-07-31 23:00:00
# data values are consistent with expectations for a full month of hourly data (31 days * 24 hours = 744 hours)

q = queue.Queue(maxsize=10)
stop_event = threading.Event()

def zscore(newval, base, minstd=1.0):
    mean = np.mean(base)
    std = max(minstd, np.std(base,ddof = 1)) # sample std dev
    score = (newval - mean) / std
    return score, mean, std

def process():
    while not stop_event.is_set() or not q.empty():
        try:
            batch = q.get(timeout=10) # wait for upto 10 seconds for batch to be available
        except queue.Empty:
            continue # check stop_event again

        hod = batch['hour_of_day'].iloc[0]
        dow = batch['day_of_week'].iloc[0]
        hour = batch['pickup_hour'].iloc[0]

        print(f"[DET] processing \nHour: {hour}, trips: {len(batch):,}")
        print("-" * 50)
        
        anomalies = 0
        eligible_zones = 0

        #zone wise aggregation
        zone_agg = batch.groupby('PULocationID').agg(
            trip_count = ('trip_distance', 'count'),
            avg_distance = ('trip_distance', 'mean'),
            avg_fare = ('fare_amount', 'mean'),
            avg_duration_sec = ('trip_duration_sec', 'mean'),
            avg_speed = ('speed_mph', 'mean')
        ).reset_index()
        for _, row in zone_agg.iterrows():
            zone = int(row['PULocationID'])

            trip_count = int(row['trip_count'])
            avg_fare = row['avg_fare']
            avg_distance = row['avg_distance']
            avg_duration = row['avg_duration_sec']
            avg_speed = row['avg_speed']

            key = (hod, dow, zone)

            base = baseline[key]

            if len(base)<20:
                continue # not enough data for stats

            eligible_zones+=1

            scores = {}
            feats = {'avg_speed': 2.0, 'avg_distance': 1.5, 'avg_fare': 1.5, 'avg_duration_sec': 1.5}
            for k,v in feats.items():
                score,mean,std = zscore(row[k], [b[k] for b in base], minstd=v)
                scores[k] = abs(score)
            
            z = max(scores.values())
            
            # if z > 2.5:
            #     worst_feat = max(scores, key = scores.get)
            #     print(f"hour: {hour}, zone: {zone}, triggered by: {worst_feat}")
            #     anomalies+=1
            # multiple scores anomaly
            trig = sum(1 for s in scores.values() if s > 2.5)

            if z >4.0 or trig>1:
                anomalies+=1
            elif trig == 1:
                feat = max(scores, key=lambda k: scores[k])
                print(f"potential anomaly feature: {feat} | score: {scores[feat]}")
            else:
                baseline[key].append({
                    'pickup_hour': hour,
                    'trip_count': trip_count,
                    'avg_distance':avg_distance,
                    'avg_fare': avg_fare,
                    'avg_duration_sec': avg_duration,
                    'avg_speed' : avg_speed
                })
            # print(f"Zone: {zone:>3} | trips : {count:>6} "
            #         f" Fare : ${row['avg_fare']:>6.2f} | "
            #         f"Distance: {row['avg_distance']:>5.2f} mi")

        if eligible_zones > 0:
            print(f"Anomaly rate for hour: {hour} | anomalies: {anomalies} | total zones: {eligible_zones} = {anomalies/eligible_zones *100}")
        q.task_done()

def simulate():
    print("processing live hours....")
    for uh in unique_hours:
        batch = con.execute("""SELECT HOUR(pickup_hour) AS hour_of_day, *
                                FROM july_trips where pickup_hour = ?""",[uh]).df()
        q.put(batch)
        #print(f"[SIM] emitted : {uh}")
        time.sleep(5) # simulate processing timec
    stop_event.set()
   

simulate_thread = threading.Thread(target=simulate, daemon=True)
processor_thread = threading.Thread(target=process, daemon=True)

simulate_thread.start()
processor_thread.start()

simulate_thread.join()
processor_thread.join()
print("Simulation complete.")