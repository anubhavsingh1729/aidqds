import duckdb


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


# --------------------

con = duckdb.connect("../data/aidqds.db")

time_buckets = {}

hours = con.execute(""" SELECT DISTINCT pickup_hour from processed_trips
                    ORDER BY pickup_hour""").df()['pickup_hour'].tolist()

baseline = {}


batch = con.execute(""" SELECT HOUR(pickup_hour) AS hour_of_day, day_of_week, PULocationID, 
                    COUNT(*) AS trip_count, AVG(trip_distance) AS avg_distance, AVG(fare_amount) AS avg_fare
                    FROM processed_trips
                    GROUP BY hour_of_day, day_of_week, PULocationID
                    """).df()

for _,row in batch.iterrows():
    baseline[(row['hour_of_day'], row['day_of_week'], row['PULocationID'])] = (row['trip_count'], row['avg_distance'], row['avg_fare'])


print(batch[(batch['hour_of_day'] == 15) & (batch['day_of_week']==1) & (batch['PULocationID']==121)])
print(baseline[(15,1,121)])