import pickle
from collections import defaultdict, deque

# ------- Sanity checks on baseline data structure ------- #

with open("../data/processed/baseline.pkl","rb") as f:
    baseline_raw = pickle.load(f)
    # restore deque structure
    baseline = defaultdict(lambda: deque(maxlen=8))
    for k,v in baseline_raw.items():
        baseline[k] = deque(v, maxlen=8)

# 1. How many unique context keys?
print(len(baseline)) 

# 2. Spot check a specific key
key = (22, 0, 161)
print(f"Observations for {key}: {len(baseline[key])}")
print(f"Trip counts: {[o['trip_count'] for o in baseline[key]]}")

# 3. Compute mean and std manually for that key
import numpy as np
counts = [o['trip_count'] for o in baseline[key]]
print(f"Mean: {np.mean(counts):.1f}")
print(f"Std:  {np.std(counts):.1f}")

# 4. Check a quiet context — should have fewer, lower counts
quiet_key = (3, 6, 161)  # Sunday 3am Zone 161
print(f"Sunday 3am counts: {[o['trip_count'] for o in baseline[quiet_key]]}")
# Should be much lower than Monday 9am

k = (9,0,161)

for obs in baseline[k]:
    if obs['trip_count']==51:
        print(obs['pickup_hour'])