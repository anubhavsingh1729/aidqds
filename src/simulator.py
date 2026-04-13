import pandas as pd
import duckdb

import numpy as np
import time
import queue

# required pre-clean data for simulation
# Remove if: trip_distance <= 0        (physically impossible)
# Remove if: fare_amount is NULL       (can't compute fare metrics)
# Remove if: pickup_hour is NULL       (can't assign to time bucket)
# Remove if: PULocationID is NULL      (can't assign to zone)

july_trips = pd.read_parquet("../data/test/yellow_tripdata_2025-07.parquet")

con = duckdb.connect("../data/aidqds.db")

con.execute("""CREATE OR REPLACE TABLE july_trips AS
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
                    AND pickup_datetime < '2025-08-01 00:00:00'""")

unique_hours = con.execute(""" SELECT Distinct pickup_hour from july_trips order by pickup_hour""").df()['pickup_hour'].tolist()
# print(f"Unique hours in July: {len(unique_hours)}")
# print(f"First: {unique_hours[0]}")
# print(f"Last:  {unique_hours[-1]}")
# Output:
# Unique hours in July: 744
# First: 2025-07-01 00:00:00
# Last:  2025-07-31 23:00:00
# data values are consistent with expectations for a full month of hourly data (31 days * 24 hours = 744 hours)

q = queue.Queue()


def process():
    batch = q.get()

    hod = batch['hour_of_day'].iloc[0]
    dow = batch['day_of_week'].iloc[0]
    hour = batch['pickup_hour'].iloc[0]

    print(f"\nHour: {hour}, number of trips: {len(batch):,}")
    print("-" * 50)

    #zone wise aggregation
    zone_agg = batch.groupby('PULocationID').agg(
        trip_count= ('trip_distance', 'count'),
        avg_distance= ('trip_distance', 'mean'),
        avg_fare= ('fare_amount', 'mean'),
        avg_duration_sec= ('trip_duration_sec', 'mean')
    ).reset_index()

    for _, row in zone_agg.iterrows():
        zone = int(row['PULocationID'])
        count = int(row['trip_count'])
        key = (hod, dow, zone)
        print(f"Zone: {zone:>3} | trips : {count:>6} "
                f" Fare : ${row['avg_fare']:>6.2f} | "
                f"Distance: {row['avg_distance']:>5.2f} mi")

for uh in unique_hours[:5]:
    batch = con.execute("""SELECT HOUR(pickup_hour) AS hour_of_day, *
                               FROM july_trips where pickup_hour = ?""",[uh]).df()
    q.put(batch)
    process()
    q.task_done()
    time.sleep(5) # simulate processing time
   
    # batch_object = {
    #     'simulated_hour' : uh,
    #     'records': batch,
    #     'day_of_week': batch['day_of_week'].iloc[0] if not batch.empty else None,
    #     'hour_of_day': batch['hour_of_day'].iloc[0] if not batch.empty else None
    # }

    # print(batch_object)

    # break  # stop after first hour for testing


# for uh in unique_hours:
#     batch = con.execute(""" SELECT HOUR(pickup_hour) AS hour_of_day, day_of_week, PULocationID, pickup_hour,
#                     count(*) AS trip_count,
#                     AVG(trip_distance) AS avg_distance,
#                     AVG(fare_amount) AS avg_fare,
#                     AVG(trip_duration_sec) AS avg_duration_sec
#                     FROM july_trips where pickup_hour = ? 
#                         GROUP BY hour_of_day, day_of_week, PULocationID, pickup_hour 
#                         ORDER BY pickup_hour""",[uh]).df()
    
#     print(f"processed hour {uh}, {len(batch):,} trips")
#     time.sleep(2)  # simulate processing time

