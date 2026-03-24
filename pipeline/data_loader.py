import pandas as pd
import numpy as np
import duckdb

con = duckdb.connect("../data/aidqds.db")  #connect to duckdb database, if it doesn't exist it will be created

#create a view in duckdb to read all parquet files in the data/raw directory
con.execute("""
create view if not exists raw_trips AS
            SELECT * FROM read_parquet('../data/raw/*.parquet')
""")

#create a table in duckdb with selected columns from raw_trips. This will be the baseline query table.
con.execute("""
create table if not exists processed_trips AS
        SELECT 
            tpep_pickup_datetime,
            DATE_TRUNC('hour',tpep_pickup_datetime) AS pickup_hour,   
            DAYOFWEEK(tpep_pickup_datetime) AS day_of_week,
            HOUR(tpep_pickup_datetime) AS hour_of_day,
            PULocationID,
            DOLocationID,
            fare_amount,
            trip_distance,
            passenger_count,
            payment_type
        FROM raw_trips
            
        WHERE tpep_pickup_datetime IS NOT NULL
            AND (passenger_count BETWEEN 1 AND 6 OR payment_type == 0) -- for payment_type 0, passenger_count is not recorded
            AND trip_distance BETWEEN 0.6 AND 75 -- value derived in the analysis notebook. For details refer to data_cleaning.md
            AND fare_amount > 3.00
            AND fare_amount/trip_distance <= 19.0
""")

# threshold value 19.0 is derived in analysis notebook. For details refer to data_cleaning.md

#con.execute("""COPY processed_trips TO '../data/processed/processed_trips.parquet' (FORMAT parquet); """)

con.close()
