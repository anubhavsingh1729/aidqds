import pandas as pd
import numpy as np
import duckdb

con = duckdb.connect("../data/aidqds.db")  #connect to duckdb database, if it doesn't exist it will be created

#create a view in duckdb to read all parquet files in the data/raw directory
con.execute("""
create or replace view raw_trips AS
            SELECT * FROM read_parquet('../data/raw/*.parquet')
""")


res = con.execute('select * from raw_trips').df()
print(res.head())