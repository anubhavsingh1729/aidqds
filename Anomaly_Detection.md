# Anomaly Detection Simulator for Urban Transportation Data

## Abstract

This document provides a comprehensive analysis of the `simulator.py` implementation, which simulates real-time anomaly detection in urban taxi transportation systems. The system addresses the critical challenge of identifying anomalous patterns in trip data across spatial and temporal dimensions, enabling proactive monitoring of transportation network health. By leveraging statistical methods and streaming data processing, the simulator demonstrates a scalable approach to detecting deviations from baseline behavior in key performance indicators such as trip speed, distance, fare amounts and trip duration.

## Problem Statement

Urban transportation systems generate vast amounts of data from taxi operations, including trip records with spatial (pickup/dropoff locations), temporal (timestamps) and economic (fare, distance) attributes. Anomalies in this data can indicate various issues:

- **Operational Disruptions**: Traffic congestion, road construction or weather events affecting trip patterns
- **Economic Irregularities**: Fare manipulation, surge pricing anomalies or systemic pricing issues
- **Safety Concerns**: Unusual trip durations or speeds potentially indicating unsafe driving conditions
- **System Failures**: GPS inaccuracies, data transmission errors or sensor malfunctions

Traditional batch processing approaches fail to detect anomalies in real-time, potentially allowing issues to propagate before intervention. The simulator addresses this gap by implementing a streaming anomaly detection system that processes hourly aggregated data at the zone level, comparing current metrics against rolling historical baselines.

## Methodology

### Data Architecture

The system employs a multi-layered architecture combining relational database storage, in-memory data structures and concurrent processing:

1. **Data Lake**: Raw trip data stored in Parquet format for efficient columnar access
2. **Analytical Database**: DuckDB for SQL-based data preprocessing and aggregation
3. **Streaming Pipeline**: Threaded producer-consumer pattern for real-time simulation
4. **Statistical Engine**: Z-score based anomaly detection with configurable thresholds

### Key Components

#### Data Preparation Pipeline

The preprocessing stage transforms raw taxi trip data into a structured format suitable for anomaly detection:

```sql
CREATE TABLE july_trips AS
SELECT *,
    (trip_distance * 3600) / trip_duration_sec AS speed_mph
FROM (
    SELECT 
        CAST(tpep_pickup_datetime AS TIMESTAMP) AS pickup_datetime,
        CAST(tpep_dropoff_datetime AS TIMESTAMP) AS dropoff_datetime,
        DAYOFWEEK(pickup_datetime) AS day_of_week,
        DATE_TRUNC('hour', pickup_datetime) AS pickup_hour,
        -- ... additional fields
    FROM read_parquet('yellow_tripdata_2025-07.parquet')
    WHERE trip_distance > 0
        AND fare_amount IS NOT NULL
        AND pickup_datetime IS NOT NULL
        AND PULocationID IS NOT NULL
)
WHERE trip_duration_sec > 0
```

**Data Quality Filters**:
- Physical impossibility checks (positive trip distance and duration)
- Completeness validation (non-null critical fields)
- Temporal consistency (valid date ranges)

#### Baseline Establishment

Historical baseline data is maintained using a sliding window approach:

- **Data Structure**: `defaultdict(lambda: deque(maxlen=25))` maintains 25 most recent observations per spatio-temporal key
- **Key Composition**: `(hour_of_day, day_of_week, zone_id)` enables granular pattern recognition
- **Persistence**: Pickle serialization for baseline state preservation across simulation runs

#### Anomaly Detection Algorithm

The core detection mechanism employs statistical process control using Z-scores:

**Z-Score Calculation**:
```python
def zscore(newval, base, minstd=1.0):
    mean = np.mean(base)
    std = max(minstd, np.std(base, ddof=1))  # Sample standard deviation
    score = (newval - mean) / std
    return score, mean, std
```

**Feature Space**:
- Average speed (mph)
- Average trip distance
- Average fare amount
- Average trip duration

**Threshold Configuration**:
- Minimum standard deviation floor prevents division by near-zero values
- Feature-specific minimum std values account for natural variability

**Anomaly Classification**:
```python
trig = sum(1 for s in scores.values() if s > 2.5)
if z > 4.0 or trig > 1:
    # Multi-feature anomaly
    anomalies += 1
elif trig == 1:
    # Single-feature anomaly
    feat = max(scores, key=lambda k: scores[k])
else:
    # Normal observation - update baseline
    baseline[key].append(new_observation)
```

### Streaming Architecture

The simulator implements a producer-consumer pattern for real-time processing simulation:

- **Producer Thread**: Iterates through chronological hourly batches
- **Consumer Thread**: Processes batches using statistical anomaly detection
- **Queue Management**: Bounded queue (maxsize=10) prevents memory overflow
- **Graceful Shutdown**: Event-driven termination ensures complete processing

## Implementation Details

### Performance Considerations

- **Memory Efficiency**: Deque-based sliding windows limit memory usage
- **Concurrent Processing**: Threading enables parallel simulation and detection
- **Database Optimization**: DuckDB provides fast analytical queries on Parquet data
- **Batch Processing**: Hourly aggregation reduces computational complexity

### Scalability Features

- **Zone-Level Granularity**: Parallel processing across taxi zones
- **Temporal Bucketing**: Hourly resolution balances timeliness and statistical power
- **Configurable Thresholds**: Adaptive anomaly sensitivity based on feature characteristics

## Results and Output

The simulator generates real-time anomaly reports with the following metrics:

- **Anomaly Rate**: Percentage of zones exhibiting anomalous behavior per hour
- **Feature Attribution**: Identification of specific metrics triggering alerts
- **Processing Throughput**: Hourly batch processing with configurable delays

Sample output:
```
[DET] processing 
Hour: 2025-07-01 00:00:00, trips: 1,234
--------------------------------------------------
Anomaly rate for hour: 2025-07-01 00:00:00 | anomalies: 3 | total zones: 156 = 1.92%
```

## Conclusion

The `simulator.py` implementation demonstrates a robust framework for real-time anomaly detection in transportation data streams. By combining statistical rigor with scalable streaming architecture, the system provides actionable insights for transportation operators to maintain service quality and respond to emerging issues.

Key contributions include:
- **Statistical Foundation**: Z-score based detection with configurable thresholds
- **Spatial-Temporal Awareness**: Zone and time-specific baseline modeling
- **Streaming Capability**: Real-time processing simulation for operational deployment
- **Extensibility**: Modular design supporting additional features and data sources

Future enhancements could include machine learning-based anomaly detection, integration with external data sources (weather, events) and automated alerting mechanisms.