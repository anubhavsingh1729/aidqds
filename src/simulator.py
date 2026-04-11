import pandas as pd
import duckdb

import numpy as np
import time
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
                    AND pickup_hour IS NOT NULL
                    AND PULocationID IS NOT NULL
                    AND pickup_hour >= '2025-07-01 00:00:00'
                    AND pickup_hour < '2025-08-01 00:00:00'""")

unique_hours = con.execute(""" SELECT Distinct pickup_hour from july_trips order by pickup_hour""").df()['pickup_hour'].tolist()

print(unique_hours[:10])

for uh in unique_hours:
    batch = con.execute(""" SELECT HOUR(pickup_hour) AS hour_of_day, day_of_week, PULocationID, pickup_hour,
                    count(*) AS trip_count,
                    AVG(trip_distance) AS avg_distance,
                    AVG(fare_amount) AS avg_fare,
                    AVG(trip_duration_sec) AS avg_duration_sec
                    from july_trips where pickup_hour = ? group by hour_of_day, day_of_week, PULocationID, pickup_hour 
                        order by pickup_hour""",[uh]).df()
    
    print(f"processed hour {uh}, {len(batch):,} trips")
    time.sleep(10)  # simulate processing time

    