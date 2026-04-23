""" 
test simulator.py for data simulation and processing logic 

run from root of project:
    python tests/simulator_test.py

Requirements:

Duckdb  database at ../data/aidqds.db with preprocessed_trips table
Parquet file at ../data/test/yellow_tripdata_2025-07.parquet with cleaned July 2025 trip data
baseline.pkl already generated from baseline.py

"""

import pandas as pd
import duckdb

import numpy as np
import time
import queue
import threading


DB_PATH = "../data/aidqds.db"
FILE_PATH = "../data/test/yellow_tripdata_2025-07.parquet"

QUEUE_MAX_SIZE = 10

july_trips = pd.read_parquet(FILE_PATH)
con = duckdb.connect(DB_PATH)

unique_hours = con.execute("""SELECT Distinct pickup_hour from july_trips order by pickup_hour""").df()['pickup_hour'].tolist()
print(f"Unique hours in July: {len(unique_hours)}")
print(f"First: {unique_hours[0]}")
print(f"Last:  {unique_hours[-1]}")

def make_queue(MAX_SIZE=10):
    q = queue.Queue(maxsize=MAX_SIZE)
    stop_event = threading.Event()
    return q, stop_event
#--------------------------------------------------------------------
#               TEST 5 hour data fetch and processing simulation
#--------------------------------------------------------------------

def fetch_batch(hour):
    """ fetch raw records for one hour bucket from duckdb """
    return con.execute("""SELECT HOUR(pickup_hour) AS hour_of_day, *
                        FROM july_trips 
                       where pickup_hour = ?""",[hour]).df()

def test1():
    q, stop_event = make_queue(QUEUE_MAX_SIZE)
    results = {"produced": 0, "processed": 0, "errors": []}

    def process():
        while not stop_event.is_set() or not q.empty():
            try:
                batch = q.get(timeout=10) # wait for upto 10 seconds for batch to be available
            except queue.Empty:
                continue # check stop_event again

            hour = batch['pickup_hour'].iloc[0]
            print(f"[DET] processing \nHour: {hour}, trips: {len(batch):,}")
            print("-" * 50)
            results["processed"] += 1
            q.task_done()

    def simulate():
        for uh in unique_hours[:5]: # simulate first 5 hours for testing
            batch = fetch_batch(uh)
            q.put(batch)
            results["produced"] += 1
            print(f"[SIM] emitted : {uh}")
        stop_event.set()
    

    t1  = threading.Thread(target=simulate, daemon=True)
    t2  = threading.Thread(target=process, daemon=True)

    t1.start()
    t2.start()

    t1.join()
    t2.join()

    #Assertions

    assert results["produced"] == 5, f"Expected 5 batches produced, got {results['produced']}"
    assert results["processed"] == 5, f"Expected 5 batches processed, got {results['processed']}"
    assert len(results["errors"]) == 0, f"Expected no errors, got {len(results['errors'])} : {results['errors']}"

#--------------------------------------------------------------------
#               TEST No loss of data and correct processing logic
#--------------------------------------------------------------------

def test2():
    produced = []
    processed = []

    q, stop_event = make_queue(QUEUE_MAX_SIZE)

    def simulate():
        for uh in unique_hours[:20]: # simulate first 5 hours for testing
            batch = fetch_batch(uh)
            q.put(batch)
            produced.append(uh)
            #time.sleep(2) # simulate processing time
        stop_event.set()

    def process():
        while not stop_event.is_set() or not q.empty():
            try:
                batch = q.get(timeout=10)
            except queue.Empty:
                continue
            time.sleep(2) # simulate processing time
            hour = batch['pickup_hour'].iloc[0]
            processed.append(hour)
            q.task_done()

    t1 = threading.Thread(target=simulate, daemon=True)
    t2 = threading.Thread(target=process, daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    lost = set(produced) - set(processed)

    assert len(lost) == 0, f"Data loss detected! Lost batches: {lost}"
    assert len(produced) == len(processed), f"Produced {len(produced)} batches but processed {len(processed)} batches"

#--------------------------------------------------------------------
#               TEST Concurrency and Thread Safety
#--------------------------------------------------------------------


def test3():
    """ This test will run the simulate and process functions concurrently for a larger number of batches (e.g. 50 """

    q,stop_event = make_queue(QUEUE_MAX_SIZE)

    emit_time = []
    process_time = []

    def simulate():
        for uh in unique_hours[:50]: # simulate first 50 hours for testing
            batch = fetch_batch(uh)
            q.put(batch)
            print(f"[SIM] emitted : {uh} | queue size: {q.qsize()}")
            emit_time.append(time.time())
            time.sleep(0.3) # simulate processing time
        stop_event.set()

    def process():
        while not stop_event.is_set() or not q.empty():
            try:
                batch = q.get(timeout=10)
            except queue.Empty:
                continue
            hour = batch['pickup_hour'].iloc[0]
            print(f"[DET] processing \nHour: {hour}, trips: {len(batch):,} | queue size: {q.qsize()}")
            process_time.append(time.time())
            time.sleep(2)
            q.task_done()

    t1 = threading.Thread(target=simulate, daemon=True)
    t2 = threading.Thread(target=process, daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    sim_done = max(emit_time)
    proc_done = max(process_time)

    assert sim_done < proc_done, "Processing should finish after simulation is done"
    assert len(emit_time) == 50, f"Expected to emit 50 batches, but emitted {len(emit_time)}"
    assert len(process_time) == 50, f"Expected to process 50 batches, but processed {len(process_time)}"


if __name__ == "__main__":
    print("Running Test 1: Basic Simulation and Processing")
    test1()
    print("Test 1 complete!\n")

    print("Running Test 2: Data Integrity and Processing Logic")
    test2()
    print("Test 2 complete!\n")

    print("Running Test 3: Concurrency and Thread Safety")
    test3()
    print("Test 3 complete!\n")