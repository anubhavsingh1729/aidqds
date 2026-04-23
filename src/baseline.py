from collections import defaultdict, deque

import duckdb
import pandas as pd
import numpy as np

import pickle


con = duckdb.connect("../data/aidqds.db")

# unique_datetime = con.execute("""SELECT 
#             COUNT(DISTINCT pickup_hour) AS unique_pickups,
#             COUNT(DISTINCT dropoff_hour) AS unique_dropoffs
#             FROM processed_trips
#             """).df()

# print(unique_datetime)

# ------- datetime index -------- #

hours = con.execute("""
SELECT DISTINCT pickup_hour
                    from processed_trips
                    ORDER BY pickup_hour
""").df()['pickup_hour'].tolist()

#print(hours[:2])

# print(f"Building time index for {len(hours):,} hours bucket...")

# timeindex = {}
# for i, hour in enumerate(hours):
#     batch = con.execute("""SELECT * from processed_trips WHERE pickup_hour = ?""",[hour]).df()
#     timeindex[hour] = batch

#     if i% 500 == 0:
#         pct = i/len(hours)*100
#         #print(f"processed {i:,} hours buckets, {pct:,.2f}% complete")
#         print(f"{pct:,.2f}%- hours, {len(batch):,} trips")

# con.close()


# -------------------- baseline stats -------------------------------- #

con = duckdb.connect("../data/aidqds.db")

dt = con.execute("""SELECT HOUR(pickup_hour) AS hour_of_day, day_of_week, PULocationID, pickup_hour,
                 count(*) AS trip_count,
                 AVG(trip_distance) AS avg_distance,
                 AVG(fare_amount) AS avg_fare,
                 AVG(trip_duration_sec) AS avg_duration_sec,
                 AVG(speed_mph) AS avg_speed
                 FROM processed_trips
                 GROUP BY hour_of_day, day_of_week, PULocationID, pickup_hour
                 order by pickup_hour""").df()


baseline = defaultdict(lambda: deque(maxlen=25))

for _,row in dt.iterrows():
    key = (row['hour_of_day'], row['day_of_week'], row['PULocationID'])
    
    baseline[key].append({
        'trip_count':row['trip_count'],
        'avg_distance':row['avg_distance'],
        'avg_fare':row['avg_fare'],
        'avg_duration_sec':row['avg_duration_sec'],
        'avg_speed':row['avg_speed'],
        'pickup_hour': row['pickup_hour']
    })

# ------- save baseline dictionary ------- #
with open("../data/processed/baseline.pkl","wb") as f:
    pickle.dump(dict(baseline), f)

print("baseline stats saved")


