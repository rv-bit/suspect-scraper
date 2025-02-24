import pandas as pd
import json
import sys
import time

# def process_data():
#     # Sample dataset as a dictionary (you can replace this with any dataset)
#     data = {
#         'Name': ['Alice', 'Bob', 'Charlie', 'David'],
#         'Age': [25, 30, 35, 40],
#         'Occupation': ['Engineer', 'Doctor', 'Artist', 'Scientist']
#     }

#     # Convert to DataFrame
#     df = pd.DataFrame(data)

#     # Filter data (example: only include Age > 30)
#     filtered_df = df[df['Age'] > 30]

#     # Convert the result to a list of dictionaries
#     result = filtered_df.to_dict(orient='records')

#     # Return the result as JSON
#     print(json.dumps(result))
#     sys.stdout.flush()

# if __name__ == '__main__':
#     process_data()

# Simulate loading large datasets
data1 = pd.DataFrame({'A': range(10), 'B': range(10, 20)})
data2 = pd.DataFrame({'X': range(20, 30), 'Y': range(30, 40)})

print(json.dumps(data1.to_dict(orient='records')), flush=True)
print("===END===", flush=True)  # Separator between tables
time.sleep(1)  # Simulate processing delay
print(json.dumps(data2.to_dict(orient='records')), flush=True)
print("===END===", flush=True)