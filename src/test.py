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

with open(BASELINE_PATH,"rb") as f:
    baseline_raw = pickle.load(f)
    # restore deque structure
    baseline = defaultdict(lambda: deque(maxlen=50))
    for k,v in baseline_raw.items():
        baseline[k] = deque(v, maxlen=50)

con.execute("""CREATE or replace TABLE  july_trips AS 
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
            
            FROM read_parquet('../data/test/yellow_tripdata_2025-07.parquet')
                
            WHERE trip_distance > 0
                    AND fare_amount IS NOT NULL
                    AND pickup_datetime IS NOT NULL
                    AND PULocationID IS NOT NULL
                    AND pickup_datetime >= '2025-07-01 00:00:00'
                    AND pickup_datetime < '2025-08-01 00:00:00'
            )      
            """)

dt = con.execute("""SELECT pickup_hour, day_of_week, PULocationID, trip_duration_sec, trip_distance, fare_amount, speed_mph,
                 pickup_datetime, dropoff_datetime
            FROM july_trips
            ORDER BY pickup_hour, day_of_week, PULocationID
            """).df()

print(dt.iloc[910])
