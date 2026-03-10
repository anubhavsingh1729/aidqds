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
        from raw_trips
        where trip_distance > 0
""")


print(con.execute("""Select * from processed_trips limit 10""").df())
