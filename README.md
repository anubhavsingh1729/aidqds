# Anomaly Detection in Urban Transportation Systems

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![DuckDB](https://img.shields.io/badge/DuckDB-1.5.0-green.svg)](https://duckdb.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive system for real-time anomaly detection in urban taxi transportation data, enabling proactive monitoring of transportation network health through statistical analysis of spatio-temporal patterns.

## 🚀 Features

- **Real-time Anomaly Detection**: Streaming processing of taxi trip data with immediate anomaly identification
- **Spatio-temporal Analysis**: Zone-level and time-specific pattern recognition using historical baselines
- **Statistical Methods**: Z-score based detection with configurable thresholds for multiple features
- **Scalable Architecture**: Concurrent processing with producer-consumer threading model
- **Data Quality Assurance**: Comprehensive filtering and validation of raw transportation data
- **Interactive Dashboard**: Web-based visualization for anomaly monitoring and analysis

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Methodology](#methodology)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Data Pipeline](#data-pipeline)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Problem Statement

Urban transportation systems generate vast amounts of data from taxi operations. Anomalies in this data can indicate critical issues such as:

- **Operational Disruptions**: Traffic congestion, road construction, or weather events
- **Economic Irregularities**: Fare manipulation or surge pricing anomalies
- **Safety Concerns**: Unusual trip durations or speeds indicating unsafe conditions
- **System Failures**: GPS inaccuracies or sensor malfunctions

Traditional batch processing fails to detect anomalies in real-time, allowing issues to propagate. This system implements streaming anomaly detection that processes hourly aggregated data at the zone level, comparing current metrics against historical baselines.

## 🔬 Methodology

### Core Algorithm

The system employs statistical process control using Z-scores to detect deviations from baseline behavior:

**Features Monitored**:
- Average trip speed (mph)
- Average trip distance
- Average fare amount
- Average trip duration

**Anomaly Classification**:
- **Multi-feature Anomalies**: When multiple metrics exceed thresholds simultaneously
- **Single-feature Anomalies**: When one specific metric shows significant deviation
- **Normal Operation**: Updates baseline with new observations

### Architecture

- **Data Lake**: Parquet-based storage for efficient columnar access
- **Analytical Database**: DuckDB for fast SQL-based preprocessing
- **Streaming Pipeline**: Threaded producer-consumer pattern
- **Statistical Engine**: Configurable Z-score thresholds with minimum variance floors

## 🛠 Installation

### Prerequisites

- Python 3.8 or higher
- DuckDB database
- Required Python packages (see requirements.txt)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/anomaly-detection.git
   cd anomaly-detection
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up data directory structure**:
   ```bash
   mkdir -p data/{raw,processed,test}
   ```

## 📖 Usage

### Data Preparation

1. **Load raw data**:
   ```bash
   python pipeline/data_loader.py
   ```

2. **Generate baseline statistics**:
   ```bash
   python src/baseline.py
   ```

### Run Anomaly Detection

```bash
python src/simulator.py
```

The simulator will process hourly batches of trip data, outputting anomaly rates and feature-specific alerts in real-time.

### Interactive Dashboard

```bash
cd roadmap
npm install
npm run dev
```

Access the dashboard at `http://localhost:5173` for visualization of anomaly patterns.

## 📁 Project Structure

```
anomaly-detection/
├── analysis_notebook.ipynb     # Data analysis and exploration
├── data_cleaning.md           # Data preprocessing documentation
├── requirements.txt           # Python dependencies
├── simulator_explanation.md   # Detailed technical documentation
├── pipeline/
│   └── data_loader.py         # Data ingestion and preprocessing
├── src/
│   ├── baseline.py            # Historical baseline generation
│   ├── data_stream.py         # Streaming data utilities
│   ├── simulator.py           # Main anomaly detection engine
│   ├── test.py                # Testing utilities
│   └── sanity_check.py        # Data validation scripts
├── tests/
│   └── simulator_test.py      # Unit tests
├── data/
│   ├── raw/                   # Raw Parquet data files
│   ├── processed/             # Cleaned and processed data
│   └── test/                  # Test datasets
├── roadmap/                   # React dashboard application
│   ├── src/
│   ├── public/
│   └── package.json
└── extra/                     # Additional resources
```

## 🔄 Data Pipeline

### Input Data
- **Source**: NYC Yellow Taxi trip records (Parquet format)
- **Key Fields**: pickup/dropoff timestamps, locations, fare, distance, duration
- **Temporal Range**: Configurable date ranges for training and testing

### Processing Stages

1. **Data Ingestion**: Load raw Parquet files into DuckDB
2. **Quality Filtering**: Remove invalid records based on physical constraints
3. **Feature Engineering**: Calculate derived metrics (speed, duration)
4. **Aggregation**: Hourly zone-level statistics for anomaly detection
5. **Baseline Creation**: Historical patterns for comparison

### Output Metrics

- Anomaly rate per hour per zone
- Feature-specific deviation scores
- Real-time processing statistics

## ⚙ Configuration

### Anomaly Thresholds

Modify thresholds in `src/simulator.py`:

```python
feats = {
    'avg_speed': 2.0,        # Minimum std for speed
    'avg_distance': 1.5,     # Minimum std for distance
    'avg_fare': 1.5,         # Minimum std for fare
    'avg_duration_sec': 1.5  # Minimum std for duration
}
```

### Database Paths

Update paths in source files:
- `DB_PATH`: DuckDB database location
- `BASELINE_PATH`: Pickled baseline statistics
- `FILE_PATH`: Test data file

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guidelines
- Add unit tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Additional Resources

- [Simulator Technical Documentation](simulator_explanation.md)
- [Data Cleaning Guide](data_cleaning.md)
- [Analysis Notebook](analysis_notebook.ipynb)

## 🙏 Acknowledgments

- NYC Taxi and Limousine Commission for open data
- DuckDB community for the analytical database
- Contributors and maintainers

---

**Note**: This system is designed for research and demonstration purposes. For production deployment, additional security, monitoring, and scalability considerations are required.