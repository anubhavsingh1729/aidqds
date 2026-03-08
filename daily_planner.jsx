import { useState, useEffect } from "react";

const WEEKS = [
  {
    id: 1, title: "Environment & Data Pipeline", color: "#2D6A4F", light: "#d8f3dc",
    summary: "Set up your workspace and build the core data engine. Zero LLM. Pure data engineering."
  },
  {
    id: 2, title: "Context Builder + LLM + UI", color: "#1B4FC4", light: "#dbe9ff",
    summary: "Wire up the LLM layer and build the live dashboard. The visible product takes shape."
  },
  {
    id: 3, title: "Evaluation Framework", color: "#9B2226", light: "#fde8e8",
    summary: "Inject known anomalies, measure LLM accuracy, find where it fails. The differentiator week."
  },
  {
    id: 4, title: "Fix Failures + Document", color: "#7B2D8B", light: "#f5e6ff",
    summary: "Patch your failure modes and write the engineering docs that impress senior engineers."
  },
  {
    id: 5, title: "Deploy + Publish + Get Seen", color: "#B5500B", light: "#fff0e0",
    summary: "Ship it live, write the blog post, post on LinkedIn, and reach out to engineers."
  }
];

const DAYS = [
  // ── WEEK 1 ──────────────────────────────────────────────────────────────
  {
    day: 1, week: 1, title: "Project Setup & Environment",
    duration: "1.5 hrs", difficulty: "Easy",
    goal: "Get your workspace ready so you never have a 'it works on my machine' problem.",
    items: [
      { id: "1-1", text: "Install Python 3.11+ if not already installed. Run `python --version` to confirm." },
      { id: "1-2", text: "Create project folder: `mkdir datasentinel && cd datasentinel`" },
      { id: "1-3", text: "Create virtual environment: `python -m venv venv` then activate it." },
      { id: "1-4", text: "Install core deps: `pip install pandas duckdb fastapi uvicorn streamlit python-dotenv httpx pyarrow`" },
      { id: "1-5", text: "Run `git init`, create a `.gitignore` (add venv/, .env, __pycache__, *.pyc, data/raw/)." },
      { id: "1-6", text: "Create `requirements.txt` by running `pip freeze > requirements.txt`." },
      { id: "1-7", text: "Create folder structure: `src/`, `data/raw/`, `data/processed/`, `eval/`, `docs/`." },
      { id: "1-8", text: "Push initial commit to a new GitHub repo. Title it 'DataSentinel — AI Data Quality Monitor'." }
    ]
  },
  {
    day: 2, week: 1, title: "Download & Explore the Dataset",
    duration: "2 hrs", difficulty: "Easy",
    goal: "Get the NYC Taxi data and understand it deeply before writing a single line of logic.",
    items: [
      { id: "2-1", text: "Go to nyc.gov/site/tlc/about/tlc-trip-record-data.page. Download Yellow Taxi Parquet files for Jan–Jun 2023 (6 files)." },
      { id: "2-2", text: "Save them to `data/raw/`. Each file is ~50MB. Total ~300MB." },
      { id: "2-3", text: "Open a Jupyter notebook (or plain Python script): load one month with `pd.read_parquet()`." },
      { id: "2-4", text: "Print `.dtypes`, `.shape`, `.describe()`, and `.isnull().sum()` — understand every column." },
      { id: "2-5", text: "Plot trip count by hour of day and by day of week. Observe rush hour peaks and weekend patterns." },
      { id: "2-6", text: "Check the `PULocationID` column — these are pickup zone IDs (1–265). Look up the Taxi Zone Lookup CSV (also on the TLC site)." },
      { id: "2-7", text: "Write down 3 observations about natural patterns in the data that your anomaly detector must respect. Save this as `docs/data_notes.md`." }
    ]
  },
  {
    day: 3, week: 1, title: "Build the DuckDB Ingestion Layer",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Create the state store that the whole system reads from and writes to.",
    items: [
      { id: "3-1", text: "Create `src/db.py`. Import duckdb. Write `get_connection()` that returns a persistent DuckDB connection to `data/sentinel.db`." },
      { id: "3-2", text: "Write `create_tables()`: create a `trips` table with all taxi columns plus a `batch_id` and `simulated_ts` column." },
      { id: "3-3", text: "Write `insert_batch(df, batch_id, simulated_ts)`: takes a DataFrame, adds metadata columns, appends to the trips table." },
      { id: "3-4", text: "Write `get_historical_window(ts, days=7)`: queries trips table for all records within 7 simulated days before a given timestamp." },
      { id: "3-5", text: "Write `get_hourly_baseline(hour, day_of_week, weeks=4)`: returns historical avg and std of trip count for a specific hour+weekday combo." },
      { id: "3-6", text: "Test it: manually insert 100 fake rows, query them back, verify `get_hourly_baseline` returns reasonable numbers." },
      { id: "3-7", text: "Commit: `git add . && git commit -m 'feat: DuckDB ingestion layer with baseline queries'`" }
    ]
  },
  {
    day: 4, week: 1, title: "Build the Stream Simulator — Part 1",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Build the time-index that lets you jump to any simulated hour instantly.",
    items: [
      { id: "4-1", text: "Create `src/simulator.py`. Write `build_time_index(parquet_dir)`: loads all 6 parquet files, extracts `tpep_pickup_datetime`, groups rows by hour bucket (floor to hour)." },
      { id: "4-2", text: "Store the index as a dict: `{datetime_hour: list_of_row_indices}`. Save it to `data/processed/time_index.pkl` using pickle." },
      { id: "4-3", text: "Write `load_time_index()`: loads the pkl file. Add a check — if file doesn't exist, call `build_time_index` first." },
      { id: "4-4", text: "Write `get_batch(hour_dt)`: takes a datetime, looks up the index, returns a DataFrame of all trips in that hour." },
      { id: "4-5", text: "Test: call `get_batch` for a Monday 9am hour and a Sunday 3am hour. Print row counts. Confirm they differ as expected." },
      { id: "4-6", text: "Print min and max available hours from the index — confirm you have Jan 1 through Jun 30 2023 coverage." }
    ]
  },
  {
    day: 5, week: 1, title: "Build the Stream Simulator — Part 2",
    duration: "1.5 hrs", difficulty: "Medium",
    goal: "Make the simulator actually stream — emitting batches at a configurable real-time interval.",
    items: [
      { id: "5-1", text: "Create a Python `queue.Queue` object in simulator.py. This is the buffer between simulator and consumer." },
      { id: "5-2", text: "Write `StreamSimulator` class with `__init__(self, speed_seconds=2)` where speed_seconds is how often a new batch is emitted." },
      { id: "5-3", text: "Write `start()` method: runs in a background thread using `threading.Thread`. Each iteration: get_batch for current hour → put batch dict onto queue → advance hour pointer by 1 → sleep(speed_seconds)." },
      { id: "5-4", text: "Write `stop()` method: sets a threading Event to stop the loop cleanly." },
      { id: "5-5", text: "Write a quick test script: start the simulator, consume 5 batches from the queue, print batch metadata (hour, row count), then stop." },
      { id: "5-6", text: "Commit: `git commit -m 'feat: stream simulator with configurable replay speed and queue'`" }
    ]
  },
  {
    day: 6, week: 1, title: "Anomaly Detection — Volume & Statistical Checks",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Write the first two detection checks using real statistical logic, not just thresholds.",
    items: [
      { id: "6-1", text: "Create `src/detection.py`. Import DuckDB connection from db.py." },
      { id: "6-2", text: "Write `volume_check(batch_df, simulated_ts)`: get hourly baseline from DuckDB for this hour+weekday. Compute Z-score of current batch count vs baseline mean/std. Flag if |Z| > 2.5. Return dict: {check, triggered, actual, expected, z_score, severity}." },
      { id: "6-3", text: "Write `fare_check(batch_df, simulated_ts)`: compute mean fare in current batch. Compare to DuckDB baseline for same hour+weekday. Flag if deviation > 25%. Return same dict shape." },
      { id: "6-4", text: "Write `distance_check(batch_df, simulated_ts)`: same pattern but for `trip_distance` column." },
      { id: "6-5", text: "Important: handle the cold-start case. If DuckDB has fewer than 3 days of history for this hour slot, return {triggered: False, reason: 'insufficient_history'}. Don't flag false positives on startup." },
      { id: "6-6", text: "Test all three checks manually with a batch — first with normal data, then with a manually modified batch where you cut volume by 60%." }
    ]
  },
  {
    day: 7, week: 1, title: "Anomaly Detection — Schema & Zone Checks + Orchestrator",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Complete the detection layer and wire all checks into a single orchestrator function.",
    items: [
      { id: "7-1", text: "Write `schema_check(batch_df)`: load a saved baseline schema from `data/processed/schema_baseline.json`. Compare current batch dtypes and null rates. Flag if a non-null column now has >5% nulls, or if a new categorical value appears in payment_type or RatecodeID." },
      { id: "7-2", text: "Write `save_schema_baseline(batch_df)`: saves dtypes and value sets to the JSON. Call this once on Day 1 of simulation, never again." },
      { id: "7-3", text: "Write `zone_check(batch_df, simulated_ts)`: for the top 10 busiest zones, check if any zone has zero trips this hour that historically always has trips. Flag zone blackouts." },
      { id: "7-4", text: "Write `run_all_checks(batch_df, simulated_ts)`: calls all 5 checks, collects results, filters to only triggered ones, adds a combined severity score, returns a list of anomaly dicts." },
      { id: "7-5", text: "Test the full orchestrator: run it on 10 consecutive batches from the simulator. Print how many anomalies fire. Tune thresholds if too noisy or too silent." },
      { id: "7-6", text: "Commit: `git commit -m 'feat: complete anomaly detection layer — 5 checks + orchestrator'`" }
    ]
  },

  // ── WEEK 2 ──────────────────────────────────────────────────────────────
  {
    day: 8, week: 2, title: "Install Ollama + Test Local LLM",
    duration: "1.5 hrs", difficulty: "Easy",
    goal: "Get a local LLM running on your machine so you have zero API costs during development.",
    items: [
      { id: "8-1", text: "Go to ollama.com. Download and install Ollama for your OS." },
      { id: "8-2", text: "Run `ollama pull llama3.2` in terminal. This downloads a ~2GB model. While waiting, read about what Llama 3.2 is." },
      { id: "8-3", text: "Test: run `ollama run llama3.2` and type a message. Confirm it responds. Exit with /bye." },
      { id: "8-4", text: "Ollama exposes a REST API at localhost:11434. Test it: `curl http://localhost:11434/api/generate -d '{\"model\":\"llama3.2\",\"prompt\":\"Hello\"}'`" },
      { id: "8-5", text: "Sign up at console.groq.com (free). Get an API key. Save it to a `.env` file as `GROQ_API_KEY=...`. Add .env to .gitignore immediately." },
      { id: "8-6", text: "Test Groq: use the Groq Python SDK (`pip install groq`). Send one test message. Confirm you get a response." },
      { id: "8-7", text: "Decide your dev flow: Ollama locally (free, no limits) → Groq for deployed version. Write this in `docs/llm_notes.md`." }
    ]
  },
  {
    day: 9, week: 2, title: "Build the Context Builder",
    duration: "2 hrs", difficulty: "Hard",
    goal: "This is the most important file in your project. Build it carefully.",
    items: [
      { id: "9-1", text: "Create `src/context_builder.py`. Write `build_context(anomaly_dict, batch_df, simulated_ts)` as the main function." },
      { id: "9-2", text: "Add basic anomaly facts: what check triggered, exact actual vs expected values, Z-score, severity." },
      { id: "9-3", text: "Add temporal context: hour of day, day of week, is it rush hour (7-9am, 5-7pm), is it weekend, is it month-end (last 3 days of month)." },
      { id: "9-4", text: "Add historical context: query DuckDB — what were the last 3 hours like? Were they also anomalous? Is this an ongoing issue or sudden onset?" },
      { id: "9-5", text: "Add spatial context: if anomaly is zone-related, check the 3 nearest zones — are they also affected? Clustering = pipeline issue. Isolated = local event." },
      { id: "9-6", text: "Add confidence flag: if fewer than 7 days of history exist for this slot, set `low_context: true`. The LLM should be less confident here." },
      { id: "9-7", text: "Return a clean structured dict. Print it for one anomaly — read it as if you're the LLM. Does it have enough to make a diagnosis? Iterate if not." }
    ]
  },
  {
    day: 10, week: 2, title: "Build the LLM Client Abstraction",
    duration: "1.5 hrs", difficulty: "Medium",
    goal: "Write one LLM client that can swap between Ollama and Groq without changing other code.",
    items: [
      { id: "10-1", text: "Create `src/llm_client.py`. Write a `LLMClient` class with `__init__(self, provider='ollama')` that accepts 'ollama' or 'groq'." },
      { id: "10-2", text: "Write `call(self, system_prompt, user_message)` method: if ollama, POST to localhost:11434/api/chat. If groq, use the Groq SDK. Both return a plain string." },
      { id: "10-3", text: "Add a timeout (30 seconds) and a try/except. If the LLM call fails, return a fallback dict: {error: true, message: 'LLM unavailable'}." },
      { id: "10-4", text: "Add basic logging: print which provider was called, how long it took (use time.time()), and the first 100 chars of the response." },
      { id: "10-5", text: "Test: call the same prompt through Ollama. Confirm it works. Note the response time." },
      { id: "10-6", text: "Commit: `git commit -m 'feat: LLM client abstraction supporting Ollama and Groq'`" }
    ]
  },
  {
    day: 11, week: 2, title: "Write the System Prompt + Diagnosis Engine",
    duration: "2 hrs", difficulty: "Hard",
    goal: "The system prompt is engineering work, not creative writing. Be precise and structured.",
    items: [
      { id: "11-1", text: "Create `src/diagnosis_engine.py`. Read your context_builder output carefully — design a prompt that uses every field." },
      { id: "11-2", text: "Write the system prompt in a separate string. It must instruct the LLM to: (1) identify probable root cause, (2) distinguish pipeline failure from real-world event, (3) rate confidence 1-10, (4) give exactly 3 remediation steps, (5) say 'INSUFFICIENT_CONTEXT' if it can't diagnose." },
      { id: "11-3", text: "Write `format_context_as_prompt(context_dict)`: converts your context dict into a clean user message string the LLM can read easily." },
      { id: "11-4", text: "Write `parse_llm_response(raw_text)`: extracts structured fields from LLM output. Use simple string parsing or ask the LLM to respond in JSON." },
      { id: "11-5", text: "Write `diagnose(anomaly_dict, batch_df, simulated_ts)`: calls context_builder → format_context → llm_client → parse_response. Returns structured diagnosis." },
      { id: "11-6", text: "Run 5 different anomaly types through diagnose(). Read each output. Is it specific or generic? Refine the prompt until the outputs are genuinely informative." },
      { id: "11-7", text: "Commit: `git commit -m 'feat: diagnosis engine with context-aware LLM prompting'`" }
    ]
  },
  {
    day: 12, week: 2, title: "Build Streamlit App — Skeleton + Batch Feed",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Get the app running with the live batch feed. Make the streaming feel real.",
    items: [
      { id: "12-1", text: "Create `app.py` at project root. `import streamlit as st`. Run `streamlit run app.py` — confirm blank page loads." },
      { id: "12-2", text: "Create a shared state object using `st.session_state`. Store: simulator instance, batch history list, anomaly list, running flag." },
      { id: "12-3", text: "Add a sidebar: START/STOP button, speed selector (1×, 2×, 4×), a 'Simulated Time' display." },
      { id: "12-4", text: "Add the left panel — batch feed. Use `st.empty()` placeholder that re-renders every cycle. Show last 20 batches as rows: timestamp, trip count, vs-baseline delta, CLEAN/ALERT badge." },
      { id: "12-5", text: "Wire up the simulator: when START is pressed, create `StreamSimulator`, call `start()`, store in session_state." },
      { id: "12-6", text: "Use `st.rerun()` in a loop with `time.sleep(1)` to refresh the UI every second and pick up new batches from the queue." },
      { id: "12-7", text: "Test: run the app, press START, watch the batch feed populate in real time. Confirm it feels live." }
    ]
  },
  {
    day: 13, week: 2, title: "Add Anomaly Alerts Panel to UI",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Make anomalies visually prominent — they should feel like real alerts, not just table rows.",
    items: [
      { id: "13-1", text: "In `app.py`, add the center column for anomaly alerts. Use `st.columns([1,2,1])` layout for feed / alerts / zones." },
      { id: "13-2", text: "For each anomaly in session_state, render a styled card using `st.container()` with a colored `st.markdown()` border (use HTML in markdown)." },
      { id: "13-3", text: "Each card shows: anomaly type badge, time label, zone name, actual vs baseline numbers, Z-score metric." },
      { id: "13-4", text: "Add an 'Explain with LLM' button per card. On click: set a diagnosing flag, call `diagnosis_engine.diagnose()`, store result." },
      { id: "13-5", text: "Add a spinner (`st.spinner`) while LLM is running. Replace it with the diagnosis text when done." },
      { id: "13-6", text: "Add the right panel: zone status grid. For each of the 10 key zones, show a green/red dot based on whether it appeared in a recent anomaly." },
      { id: "13-7", text: "Commit: `git commit -m 'feat: full Streamlit UI with anomaly cards and LLM diagnosis display'`" }
    ]
  },
  {
    day: 14, week: 2, title: "Polish UI + End-to-End Test",
    duration: "1.5 hrs", difficulty: "Easy",
    goal: "Run the full system end to end. Fix anything broken. Make it feel solid.",
    items: [
      { id: "14-1", text: "Run the complete app. Start the stream. Let it run for 5 simulated days. Click 'Explain' on every anomaly that fires. Read every diagnosis." },
      { id: "14-2", text: "Fix any crashes or edge cases: what happens when LLM is slow? What if the queue backs up? What if no anomalies fire for 20 batches?" },
      { id: "14-3", text: "Add a stats bar at top: Batches Processed, Anomalies Detected, Clean Batch Rate %, LLM Diagnoses Run." },
      { id: "14-4", text: "Add a metrics panel showing current hour's actual vs baseline as a simple bar using `st.metric()`." },
      { id: "14-5", text: "Write `docs/architecture.md`: describe each of the 5 layers (simulator, ingestion, detection, context, LLM) in 2-3 sentences each." },
      { id: "14-6", text: "Commit everything. Tag this commit: `git tag v0.1-working-prototype`" }
    ]
  },

  // ── WEEK 3 ──────────────────────────────────────────────────────────────
  {
    day: 15, week: 3, title: "Set Up Eval Framework + Anomaly Injector",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Build the machinery to test your system against known ground truth.",
    items: [
      { id: "15-1", text: "Create `eval/` folder. Create `eval/__init__.py`, `eval/injector.py`, `eval/runner.py`, `eval/ground_truth.json`." },
      { id: "15-2", text: "Write `injector.py` — `inject_volume_drop(batch_df, zone_id, severity=0.7)`: removes 70% of rows from a specific zone." },
      { id: "15-3", text: "Write `inject_fare_spike(batch_df, multiplier=3.1)`: multiplies fare_amount by 3.1 for all rows." },
      { id: "15-4", text: "Write `inject_schema_drift(batch_df)`: replaces 'Credit card' payment_type with new value 'CRYPTO' for ~30% of rows." },
      { id: "15-5", text: "Write `inject_zone_blackout(batch_df, zone_id)`: removes all rows for a specific zone_id." },
      { id: "15-6", text: "Write `inject_null_fields(batch_df, column)`: sets a specific column to NaN for all rows." },
      { id: "15-7", text: "Test each injector: apply it to a real batch, confirm the expected change happened, confirm the anomaly detector fires." }
    ]
  },
  {
    day: 16, week: 3, title: "Build Ground Truth + Eval Runner",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Define what 'correct' looks like so you can measure objectively.",
    items: [
      { id: "16-1", text: "Write `ground_truth.json`: 20 test cases. Each has: injection_type, injected_params, expected_check_triggered, expected_cause_category, expected_remediation_theme." },
      { id: "16-2", text: "Cover all 5 injection types with 4 cases each — vary the zone, severity, time of day to create diverse test conditions." },
      { id: "16-3", text: "Write `runner.py` — `run_eval()`: iterates all 20 test cases, applies the injector to a real batch, runs full detection + context + LLM pipeline, stores output." },
      { id: "16-4", text: "Save all outputs to `eval/results_v1.json` — for each test case store: test_id, injection_type, detected (bool), llm_cause, llm_confidence, llm_steps, raw_response." },
      { id: "16-5", text: "Run the eval for the first time. Check: did all 20 anomalies get detected? If any were missed, note which check failed to fire." },
      { id: "16-6", text: "Commit: `git commit -m 'feat: evaluation framework with 20-case ground truth suite'`" }
    ]
  },
  {
    day: 17, week: 3, title: "Manual Scoring of LLM Outputs",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Do the hard human work of reading every LLM output and scoring it honestly.",
    items: [
      { id: "17-1", text: "Create `eval/scoring_sheet.csv` with columns: test_id, cause_accuracy (1-3), actionability (1-3), no_hallucination (0 or 1), notes." },
      { id: "17-2", text: "Define your rubric first in `eval/RUBRIC.md`: cause_accuracy 3=correct category, 2=partially correct, 1=wrong. Actionability 3=specific and feasible, 2=generic, 1=useless." },
      { id: "17-3", text: "Open `results_v1.json`. Read each LLM output carefully. Score it against the rubric. For each one, write a note explaining your score." },
      { id: "17-4", text: "Check specifically for hallucinations: did the LLM mention column names, zone IDs, or systems that weren't in your context? Mark these." },
      { id: "17-5", text: "Fill all 20 rows of the scoring sheet. Be harsh. If the output is vague, give it a 1, not a 2." },
      { id: "17-6", text: "Save the scoring sheet. This document is evidence of engineering rigor in your portfolio." }
    ]
  },
  {
    day: 18, week: 3, title: "Calculate Metrics + Find Failure Patterns",
    duration: "1.5 hrs", difficulty: "Medium",
    goal: "Turn your scores into numbers and find the patterns in what fails.",
    items: [
      { id: "18-1", text: "Write `eval/metrics.py`: load scoring_sheet.csv. Calculate: detection_rate (% of 20 anomalies detected), avg_cause_accuracy, avg_actionability, hallucination_rate, confidence_calibration." },
      { id: "18-2", text: "Confidence calibration: group cases by LLM confidence bucket (1-3, 4-6, 7-10). For each bucket, what fraction were actually accurate? If high confidence = low accuracy, it's miscalibrated." },
      { id: "18-3", text: "Print a clean metrics summary. Save it to `eval/metrics_v1.txt`." },
      { id: "18-4", text: "Now find failure patterns — group your score-1 cases. What do they have in common? Wrong anomaly type? Sparse context? Multi-column anomalies? Low volume batches?" },
      { id: "18-5", text: "Write `eval/FAILURE_PATTERNS_v1.md`: document exactly 3 failure patterns with 2-3 example cases each. Be specific — 'LLM confused zone blackouts with volume drops when both fire simultaneously'." },
      { id: "18-6", text: "Commit all eval files: `git commit -m 'eval: v1 baseline — detection rate X%, cause accuracy Y%, 3 failure patterns identified'`" }
    ]
  },
  {
    day: 19, week: 3, title: "Deep Dive on Failure Mode #1",
    duration: "2 hrs", difficulty: "Hard",
    goal: "Understand your worst failure mode deeply enough to fix it tomorrow.",
    items: [
      { id: "19-1", text: "Take your worst-scoring failure pattern. Pull out the 3-4 test cases that triggered it." },
      { id: "19-2", text: "For each failing case: print the full context dict that was sent to the LLM. Read it as if you're the LLM. What information is missing or misleading?" },
      { id: "19-3", text: "Print the actual LLM response. Identify the specific sentence where it went wrong. What did it latch onto incorrectly?" },
      { id: "19-4", text: "Form a hypothesis: is this a context problem (wrong or missing data) or a prompt problem (wrong instructions)? Write your hypothesis in a note." },
      { id: "19-5", text: "Design one specific fix — either add a new field to context_builder or change a specific instruction in the system prompt. Write the fix in plain English first, code second." },
      { id: "19-6", text: "Save your hypothesis and fix plan to `eval/fix_plan.md`. You'll implement it tomorrow." }
    ]
  },
  {
    day: 20, week: 3, title: "Deep Dive on Failure Modes #2 and #3",
    duration: "2 hrs", difficulty: "Hard",
    goal: "Complete failure analysis for all three patterns before moving to fixes.",
    items: [
      { id: "20-1", text: "Repeat Day 19 process for failure pattern #2: pull failing cases, read context, read response, find the break point, form hypothesis, write fix plan." },
      { id: "20-2", text: "Repeat for failure pattern #3." },
      { id: "20-3", text: "Now look across all three fix plans. Are any fixes contradictory — would fixing #1 make #2 worse? Note any conflicts." },
      { id: "20-4", text: "Prioritize fixes: order them by expected impact. Which one, if fixed, would improve the most test cases?" },
      { id: "20-5", text: "Write `eval/FAILURE_ANALYSIS_DRAFT.md`: for each failure mode — exact description, root cause, example case, fix planned, expected improvement." },
      { id: "20-6", text: "Commit: `git commit -m 'eval: failure analysis complete — 3 modes documented with fix plans'`" }
    ]
  },

  // ── WEEK 4 ──────────────────────────────────────────────────────────────
  {
    day: 21, week: 4, title: "Implement Fix #1",
    duration: "2 hrs", difficulty: "Hard",
    goal: "Apply your first fix and measure whether it actually worked.",
    items: [
      { id: "21-1", text: "Implement the fix from your fix_plan.md for failure mode #1. This is likely a change to context_builder.py or the system prompt in diagnosis_engine.py." },
      { id: "21-2", text: "Don't touch any other part of the code — change exactly one thing so you can attribute any improvement to this specific fix." },
      { id: "21-3", text: "Re-run eval runner on only the test cases that were failing for pattern #1 (not all 20 — that comes later)." },
      { id: "21-4", text: "Score the new outputs for those cases. Did the fix work? Did it partially work? Did it accidentally break any previously passing cases?" },
      { id: "21-5", text: "Write your finding in `eval/fix_results.md`: 'Fix #1: changed X. Before: Y/Z cases correct. After: A/Z cases correct. Unexpected side effect: [none or description]'." },
      { id: "21-6", text: "Commit: `git commit -m 'fix: failure mode 1 — [describe what you changed]'`" }
    ]
  },
  {
    day: 22, week: 4, title: "Implement Fix #2 + Fix #3",
    duration: "2 hrs", difficulty: "Hard",
    goal: "Apply remaining fixes and do a full re-evaluation to get your v2 metrics.",
    items: [
      { id: "22-1", text: "Implement fix #2. Same discipline — change one thing, note what it is." },
      { id: "22-2", text: "Implement fix #3." },
      { id: "22-3", text: "Run the full eval runner on all 20 test cases with all 3 fixes applied. Save to `eval/results_v2.json`." },
      { id: "22-4", text: "Re-score all 20 outputs using the same rubric. Fill `eval/scoring_sheet_v2.csv`." },
      { id: "22-5", text: "Run metrics.py on v2 scores. Save to `eval/metrics_v2.txt`. Compare side by side with v1." },
      { id: "22-6", text: "Calculate the delta: improvement in cause_accuracy, reduction in hallucination_rate, change in confidence calibration. Write a 3-sentence summary of what got better and what still fails." },
      { id: "22-7", text: "Commit: `git commit -m 'eval: v2 post-fix — [summary of improvement]'`" }
    ]
  },
  {
    day: 23, week: 4, title: "Write the README",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Write a README that reads like an engineering design doc, not a tutorial.",
    items: [
      { id: "23-1", text: "Open `README.md`. Structure it with these exact sections: Problem, Why Existing Tools Fall Short, Architecture, The Hard Parts, Evaluation Results, Failure Analysis, Running Locally, What I'd Build Next." },
      { id: "23-2", text: "Problem section: 2 sentences. What is the business pain? Who has it? What does it cost them?" },
      { id: "23-3", text: "Why Existing Tools Fall Short: 3 bullet points comparing to traditional monitoring. Be specific — mention Great Expectations, Monte Carlo by name." },
      { id: "23-4", text: "Architecture: embed your architecture diagram (you'll make it tomorrow). Describe each layer in 2 sentences." },
      { id: "23-5", text: "Evaluation Results: put a 2-column table — v1 vs v2 metrics. Detection rate, cause accuracy, hallucination rate." },
      { id: "23-6", text: "Failure Analysis: 3 short paragraphs — one per failure mode. Each: what failed, why, how you fixed it, what improved." },
      { id: "23-7", text: "Running Locally: exact commands from git clone to `streamlit run app.py`. Test these commands in a fresh folder." }
    ]
  },
  {
    day: 24, week: 4, title: "Architecture Diagram + EVALUATION.md",
    duration: "1.5 hrs", difficulty: "Easy",
    goal: "Create the visual artifacts that make your README scannable in 30 seconds.",
    items: [
      { id: "24-1", text: "Go to draw.io (free, no signup). Create a simple 5-box flow diagram: Parquet Files → Stream Simulator → DuckDB → Anomaly Detection → Context Builder → LLM Diagnosis → Dashboard." },
      { id: "24-2", text: "Use clean styling. Export as PNG. Save to `docs/architecture.png`. Embed in README.md." },
      { id: "24-3", text: "Create `eval/EVALUATION.md`: explain your eval methodology. What are the 20 test cases? How did you inject anomalies? What does your rubric measure and why?" },
      { id: "24-4", text: "Add the v1 vs v2 metrics table to EVALUATION.md. Add the scoring sheet as an appendix." },
      { id: "24-5", text: "Create `eval/FAILURE_ANALYSIS.md`: the polished version of your draft. For each failure mode — clear title, what happened, root cause, fix applied, result." },
      { id: "24-6", text: "Commit everything: `git commit -m 'docs: README, architecture diagram, evaluation and failure analysis docs'`" }
    ]
  },
  {
    day: 25, week: 4, title: "Code Cleanup + Final Local Test",
    duration: "1.5 hrs", difficulty: "Easy",
    goal: "Make your code look like it was written by a professional, not a student.",
    items: [
      { id: "25-1", text: "Add docstrings to every function in every file. Format: one-line summary, Args, Returns." },
      { id: "25-2", text: "Add type hints to all function signatures: `def volume_check(batch_df: pd.DataFrame, simulated_ts: datetime) -> dict:`" },
      { id: "25-3", text: "Search for any hardcoded values — thresholds, file paths, magic numbers. Move them to a `config.py` file with clear names." },
      { id: "25-4", text: "Run `pip freeze > requirements.txt` to update with all current dependencies." },
      { id: "25-5", text: "Delete your `data/sentinel.db` and `data/processed/` files. Clone your repo into a fresh folder. Follow your own README instructions. Does it work from scratch?" },
      { id: "25-6", text: "Fix anything that broke in the fresh clone test. Commit: `git commit -m 'refactor: type hints, docstrings, config cleanup — reproducible from scratch'`" }
    ]
  },

  // ── WEEK 5 ──────────────────────────────────────────────────────────────
  {
    day: 26, week: 5, title: "Set Up Hugging Face Spaces + Groq Integration",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Get the app deployed so it has a public URL a recruiter can click.",
    items: [
      { id: "26-1", text: "Create a Hugging Face account at huggingface.co if you don't have one." },
      { id: "26-2", text: "Create a new Space: click New Space → name it 'datasentinel' → select Streamlit → Public." },
      { id: "26-3", text: "In your Space settings → Repository secrets: add `GROQ_API_KEY` with your Groq key value." },
      { id: "26-4", text: "In `llm_client.py`: update `__init__` so if provider is not set, it reads `GROQ_API_KEY` from environment. Fall back to Ollama if env var is missing (for local dev)." },
      { id: "26-5", text: "Create `packages.txt` in project root if any system packages are needed. Create `.streamlit/config.toml` with theme settings." },
      { id: "26-6", text: "Push your repo to the HF Space using the git remote they provide. Watch the build logs — fix any import errors." }
    ]
  },
  {
    day: 27, week: 5, title: "Load Demo Data + Test Deployed App",
    duration: "1.5 hrs", difficulty: "Medium",
    goal: "Make sure a stranger can open your URL and immediately see something working.",
    items: [
      { id: "27-1", text: "The raw parquet files are too large for HF Spaces. Create a script `scripts/create_demo_data.py` that samples 10% of your data and saves it to `data/demo/`." },
      { id: "27-2", text: "Commit the demo data folder (small enough at 10% sample). Push to HF Space." },
      { id: "27-3", text: "Update `simulator.py`: if `data/demo/` exists, use it by default. Add a note in the UI: 'Running on demo dataset (10% sample)'." },
      { id: "27-4", text: "Open your HF Space URL in an incognito window. Press START. Watch it run. Does it work? Are anomalies firing?" },
      { id: "27-5", text: "Click 'Explain with LLM' on an anomaly. Does the diagnosis appear? Is Groq responding in the deployed environment?" },
      { id: "27-6", text: "Fix any deployment issues. The bar: a stranger must be able to open the URL, press START, and see live anomaly detection + LLM diagnosis within 60 seconds." }
    ]
  },
  {
    day: 28, week: 5, title: "Write the Blog Post",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Write one technical post on Medium that shows how you think, not just what you built.",
    items: [
      { id: "28-1", text: "Create a Medium account (free). Title: 'What I Learned Trying to Get LLMs to Reliably Explain Data Anomalies'." },
      { id: "28-2", text: "Opening paragraph: describe the business problem in 3 sentences. No jargon." },
      { id: "28-3", text: "Section 1 (200 words): Why simple anomaly detection isn't enough — the gap between 'something is wrong' and 'here's why and what to do'." },
      { id: "28-4", text: "Section 2 (300 words): The architecture — explain the context builder as the key insight. Why the LLM is the last 20%, not the core." },
      { id: "28-5", text: "Section 3 (400 words): What I measured and what failed. Show the v1 vs v2 metrics table. Describe 2 of your 3 failure modes concretely." },
      { id: "28-6", text: "Closing (100 words): what you'd build next. Link to GitHub and HF Space." },
      { id: "28-7", text: "Publish the post. Copy the URL." }
    ]
  },
  {
    day: 29, week: 5, title: "LinkedIn Post + Community Sharing",
    duration: "1 hr", difficulty: "Easy",
    goal: "Get your project in front of people who can actually help your career.",
    items: [
      { id: "29-1", text: "Write your LinkedIn post. Structure: line 1 = the problem hook, 3-4 lines = what was actually hard (not 'I built an AI'), 1 line = what you measured, links to GitHub + HF Space + blog. Under 200 words." },
      { id: "29-2", text: "Post it. Add hashtags: #DataEngineering #MLEngineering #LLM #AIEngineering — no more than 4." },
      { id: "29-3", text: "Share in the LangChain Discord or Hugging Face Discord with a genuine intro: 'Built this streaming anomaly detection system — got interesting results when I evaluated the LLM diagnosis accuracy. Feedback welcome.'" },
      { id: "29-4", text: "Find 2-3 existing LinkedIn posts about data quality or LLM engineering that have traction. Leave a substantive comment — add your perspective, not just 'great post'." },
      { id: "29-5", text: "Update your LinkedIn headline: 'Data Engineer | AI Systems | Built streaming LLM-based anomaly detection w/ evaluation framework'." }
    ]
  },
  {
    day: 30, week: 5, title: "Update Resume + Targeted Outreach",
    duration: "2 hrs", difficulty: "Medium",
    goal: "Turn the project into job applications. Be specific and targeted, not spray-and-pray.",
    items: [
      { id: "30-1", text: "Add project to resume under 'Projects'. 3 bullet points: (1) what you built and the tech stack, (2) the eval result ('achieved X% diagnosis accuracy, identified and fixed 3 failure modes'), (3) deployment ('deployed live at [HF Space URL]')." },
      { id: "30-2", text: "Find 10 job listings for roles like MLOps Engineer, ML Data Engineer, AI Engineer, Data Quality Engineer. Save them to a spreadsheet." },
      { id: "30-3", text: "For each listing, identify 1-2 engineers at that company on LinkedIn. Look at their profiles — do they work on anything related to your project?" },
      { id: "30-4", text: "Write 5 outreach messages to engineers whose work connects to yours. Mention something specific about their work. Reference your project. Ask one specific question. Keep it under 100 words." },
      { id: "30-5", text: "Send those 5 messages. Do not ask for a job. Ask for feedback or a 15-minute conversation." },
      { id: "30-6", text: "Apply to the 10 jobs with your updated resume. Tailor the first 2 lines of your cover note (if required) to reference the specific role's data infrastructure or AI challenges." }
    ]
  }
];

const DIFF_COLORS = { Easy: "#2D6A4F", Medium: "#B5500B", Hard: "#9B2226" };

export default function DailyPlanner() {
  const KEY = "datasentinel_checked_v1";
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  });
  const [activeDay, setActiveDay] = useState(1);
  const [activeWeek, setActiveWeek] = useState(1);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }));

  const dayProgress = (d) => {
    const done = d.items.filter(i => checked[i.id]).length;
    return { done, total: d.items.length, pct: Math.round((done / d.items.length) * 100) };
  };

  const weekDays = DAYS.filter(d => d.week === activeWeek);
  const totalItems = DAYS.flatMap(d => d.items).length;
  const totalDone = Object.values(checked).filter(Boolean).length;

  const current = DAYS.find(d => d.day === activeDay) || DAYS[0];
  const prog = dayProgress(current);
  const week = WEEKS.find(w => w.id === current.week);

  return (
    <div style={{
      background: "#f5f0e8",
      minHeight: "100vh",
      fontFamily: "'Crimson Pro', 'Georgia', serif",
      color: "#1a1208"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #e8e0d0; }
        ::-webkit-scrollbar-thumb { background: #c8b89a; border-radius: 2px; }
        .day-btn:hover { background: rgba(0,0,0,0.06) !important; }
        .task-row:hover { background: rgba(0,0,0,0.04) !important; }
        @keyframes check { from{transform:scale(0)} to{transform:scale(1)} }
        .check-anim { animation: check 0.15s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.25s ease forwards; }
        .week-tab:hover { opacity:0.75; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#1a1208",
        color: "#f5f0e8",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", letterSpacing: "3px", color: "#8a7a60", marginBottom: "4px" }}>
            DATASENTINEL PROJECT
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px" }}>
            Daily Build Plan
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", color: "#8a7a60", marginBottom: "4px" }}>OVERALL PROGRESS</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#c8a96e" }}>{totalDone}<span style={{ fontSize: "14px", color: "#8a7a60" }}>/{totalItems}</span></div>
          <div style={{ width: "120px", height: "4px", background: "#333", borderRadius: "2px", marginTop: "6px", marginLeft: "auto" }}>
            <div style={{ height: "100%", width: `${Math.round(totalDone/totalItems*100)}%`, background: "#c8a96e", borderRadius: "2px", transition: "width 0.4s" }} />
          </div>
        </div>
      </div>

      {/* Week tabs */}
      <div style={{ display: "flex", background: "#e8e0d0", borderBottom: "1px solid #c8b89a" }}>
        {WEEKS.map(w => (
          <button key={w.id} className="week-tab" onClick={() => { setActiveWeek(w.id); setActiveDay(DAYS.find(d => d.week === w.id).day); }} style={{
            flex: 1, padding: "10px 8px", border: "none", cursor: "pointer",
            background: activeWeek === w.id ? "#f5f0e8" : "transparent",
            borderBottom: activeWeek === w.id ? `3px solid ${w.color}` : "3px solid transparent",
            fontFamily: "'JetBrains Mono'", fontSize: "9px", letterSpacing: "1.5px",
            color: activeWeek === w.id ? w.color : "#8a7a60", transition: "all 0.15s",
            textTransform: "uppercase"
          }}>
            W{w.id}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 118px)" }}>

        {/* Left — Day list */}
        <div style={{ width: "200px", flexShrink: 0, borderRight: "1px solid #c8b89a", overflowY: "auto", background: "#ede8de" }}>
          <div style={{ padding: "12px 16px 8px", fontFamily: "'JetBrains Mono'", fontSize: "9px", letterSpacing: "2px", color: "#8a7a60" }}>
            {WEEKS.find(w => w.id === activeWeek)?.title.toUpperCase()}
          </div>
          {weekDays.map(d => {
            const p = dayProgress(d);
            const isActive = d.day === activeDay;
            const isDone = p.pct === 100;
            return (
              <button key={d.day} className="day-btn" onClick={() => setActiveDay(d.day)} style={{
                display: "block", width: "100%", padding: "10px 16px", border: "none", cursor: "pointer",
                background: isActive ? "#f5f0e8" : "transparent", textAlign: "left",
                borderLeft: `3px solid ${isActive ? week?.color || "#c8a96e" : isDone ? "#c8a96e" : "transparent"}`,
                transition: "all 0.15s"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "9px", color: isActive ? week?.color : "#8a7a60", letterSpacing: "1px" }}>
                    DAY {d.day}
                  </span>
                  {isDone && <span style={{ fontSize: "10px", color: "#2D6A4F" }}>✓</span>}
                </div>
                <div style={{ fontSize: "12px", color: isActive ? "#1a1208" : "#5a4a30", lineHeight: "1.3", fontWeight: isActive ? 600 : 400 }}>
                  {d.title}
                </div>
                <div style={{ marginTop: "5px", height: "2px", background: "#c8b89a", borderRadius: "1px" }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: isDone ? "#2D6A4F" : "#c8a96e", borderRadius: "1px", transition: "width 0.3s" }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
          <div className="fade-up" key={activeDay}>

            {/* Day header */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", letterSpacing: "2px", color: week?.color, background: `${week?.color}18`, padding: "3px 10px", borderRadius: "2px", border: `1px solid ${week?.color}30` }}>
                  WEEK {current.week} · DAY {current.day}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", color: DIFF_COLORS[current.difficulty], background: `${DIFF_COLORS[current.difficulty]}15`, padding: "3px 10px", borderRadius: "2px", border: `1px solid ${DIFF_COLORS[current.difficulty]}30` }}>
                  {current.difficulty}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", color: "#8a7a60" }}>
                  ⏱ {current.duration}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", color: "#8a7a60", marginLeft: "auto" }}>
                  {prog.done}/{prog.total} done
                </span>
              </div>

              <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "8px", color: "#1a1208" }}>
                {current.title}
              </h1>

              <div style={{ borderLeft: `3px solid ${week?.color}`, paddingLeft: "14px" }}>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: "9px", color: "#8a7a60", letterSpacing: "2px", marginBottom: "3px" }}>TODAY'S GOAL</div>
                <p style={{ fontSize: "15px", color: "#5a4a30", lineHeight: "1.6", fontStyle: "italic" }}>{current.goal}</p>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: "16px", height: "5px", background: "#c8b89a", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${prog.pct}%`, background: prog.pct === 100 ? "#2D6A4F" : week?.color, borderRadius: "3px", transition: "width 0.4s ease" }} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "#c8b89a", marginBottom: "20px" }} />

            {/* Tasks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {current.items.map((item, i) => {
                const done = checked[item.id];
                return (
                  <div key={item.id} className="task-row" onClick={() => toggle(item.id)} style={{
                    display: "flex", alignItems: "flex-start", gap: "14px",
                    padding: "11px 14px", borderRadius: "4px", cursor: "pointer",
                    background: done ? "rgba(45,106,79,0.06)" : "transparent",
                    border: `1px solid ${done ? "rgba(45,106,79,0.15)" : "transparent"}`,
                    transition: "all 0.15s"
                  }}>
                    {/* Checkbox */}
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "3px", flexShrink: 0, marginTop: "1px",
                      border: done ? "2px solid #2D6A4F" : "2px solid #a89880",
                      background: done ? "#2D6A4F" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s"
                    }}>
                      {done && <span className="check-anim" style={{ color: "#fff", fontSize: "12px", lineHeight: 1 }}>✓</span>}
                    </div>

                    {/* Number */}
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", color: "#a89880", width: "18px", flexShrink: 0, marginTop: "3px" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Text */}
                    <p style={{
                      fontSize: "14px", lineHeight: "1.6", color: done ? "#8a7a60" : "#2a1e0e",
                      textDecoration: done ? "line-through" : "none",
                      transition: "all 0.2s",
                      fontFamily: item.text.includes("`") ? "inherit" : "inherit"
                    }}>
                      {item.text.split(/(`[^`]+`)/g).map((part, j) =>
                        part.startsWith("`") && part.endsWith("`")
                          ? <code key={j} style={{ fontFamily: "'JetBrains Mono'", fontSize: "12px", background: "#e0d8c8", padding: "1px 5px", borderRadius: "2px", color: done ? "#8a7a60" : "#1a1208" }}>{part.slice(1,-1)}</code>
                          : part
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #c8b89a" }}>
              <button onClick={() => {
                if (current.day > 1) {
                  const prev = DAYS.find(d => d.day === current.day - 1);
                  setActiveDay(prev.day);
                  setActiveWeek(prev.week);
                }
              }} style={{
                background: "transparent", border: "1px solid #c8b89a", borderRadius: "3px",
                padding: "8px 18px", cursor: current.day > 1 ? "pointer" : "not-allowed",
                fontFamily: "'JetBrains Mono'", fontSize: "11px", color: current.day > 1 ? "#5a4a30" : "#c8b89a",
                opacity: current.day > 1 ? 1 : 0.4
              }}>← Day {current.day - 1}</button>

              <div style={{ textAlign: "center" }}>
                {prog.pct === 100 && (
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "11px", color: "#2D6A4F", background: "#d8f3dc", padding: "6px 14px", borderRadius: "3px" }}>
                    ✓ Day {current.day} Complete
                  </span>
                )}
              </div>

              <button onClick={() => {
                if (current.day < 30) {
                  const next = DAYS.find(d => d.day === current.day + 1);
                  setActiveDay(next.day);
                  setActiveWeek(next.week);
                }
              }} style={{
                background: week?.color || "#c8a96e", border: "none", borderRadius: "3px",
                padding: "8px 18px", cursor: current.day < 30 ? "pointer" : "not-allowed",
                fontFamily: "'JetBrains Mono'", fontSize: "11px", color: "#fff",
                opacity: current.day < 30 ? 1 : 0.4
              }}>Day {current.day + 1} →</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
