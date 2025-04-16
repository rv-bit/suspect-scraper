import os

import pandas as pd
import numpy as np

import warnings
warnings.filterwarnings('ignore')

BASE_DIR = "./data"
DATA_FRAMES = {}
MISSING_FILES = {}

if not os.path.isdir(BASE_DIR):
    raise Exception(f"The directory '{BASE_DIR}' does not exist. Please check your path.")

def classify_measurement_scale(col_name, col_data, summary_stats):
    """Classify measurement scale with proper type handling"""
    if pd.api.types.is_numeric_dtype(col_data):
        try:
            min_val = float(summary_stats.get('min', 0))
        except (ValueError, TypeError):
            return "Interval"
            
        if 'lat' in col_name.lower() or 'lon' in col_name.lower():
            return "Ratio"
        return "Ratio" if min_val >= 0 else "Interval"
    
    unique_count = summary_stats.get('unique', 0)
    if unique_count <= 2:
        return "Nominal (Binary)"
    
    ordinal_keywords = ['age', 'range', 'rank', 'level', 'grade']
    if any(kw in col_name.lower() for kw in ordinal_keywords):
        return "Ordinal"
    
    temporal_keywords = ['date', 'time', 'year', 'month']
    if any(kw in col_name.lower() for kw in temporal_keywords):
        return "Interval" if pd.api.types.is_datetime64_any_dtype(col_data) else "Nominal"
    
    return "Nominal"

def get_column_analysis(df):
    """Return dataframe with column analysis"""
    analysis = []
    
    for col in df.columns:
        col_data = df[col]
        dtype = str(col_data.dtype)
        sample_values = col_data.dropna().head(3).tolist()
        
        # Get measurement scale classification
        summary = col_data.describe().to_dict()
        measurement_scale = classify_measurement_scale(col, col_data, summary)
        
        analysis.append({
            'Column': col,
            'Data Type': dtype,
            'Measurement Scale': measurement_scale,
            'Sample Values': sample_values[:3]  # Show first 3 non-null values
        })

    return pd.DataFrame(analysis)

def main():
    file_paths = {}
    for year_month in sorted(os.listdir(BASE_DIR)):
        year_month_path = os.path.join(BASE_DIR, year_month)
        
        # Ensure it's a directory
        if os.path.isdir(year_month_path):
            file_paths[year_month] = []
            
            for file_name in os.listdir(year_month_path):
                if file_name.endswith(".csv"):  # Ensure it's a CSV file
                    file_path = os.path.join(year_month_path, file_name)
                    file_paths[year_month].append(file_path)

    for month, paths in file_paths.items():
        DATA_FRAMES[month] = [] # list to store multiple dataframes
        
        for path in paths:
            if os.path.exists(path):
                try:
                    df = pd.read_csv(path)
                    # month is the key, paths is a list of CSVs
                    DATA_FRAMES[month].append(df)
                    print(f"loaded:  {path}")
                except Exception as e:
                    print(f"Error loading {path}: {e}")
            else:
                print(f"File not found {path}")
                MISSING_FILES.append(path)

main()

print("\n **Summary Report**")
print("Successfully loaded")

if MISSING_FILES:
    print("\n **Missing Files List:**")
    for file in MISSING_FILES:
        print(f"- {file}")

for month, dfs in DATA_FRAMES.items():
    print(f"Description for {month}:\n")
    
    for idx, df in enumerate(dfs):
        print(f"Dataset {idx + 1} in {month}:")
        print(df.describe(include="all"))
        print("\n" + "-"*50 + "\n")

for month, dfs in DATA_FRAMES.items():
    print(f"\n{'='*50}\nAnalysis for {month}:\n{'='*50}")
    
    for idx, df in enumerate(dfs):
        print(f"\nDataset {idx + 1} (contains {len(df)} rows, {len(df.columns)} columns)")
        
        # Generate analysis dataframe
        analysis_df = get_column_analysis(df)
        
        # Print formatted results
        print("\n{:<25} {:<15} {:<20} {}".format(
            'COLUMN', 'DATA TYPE', 'MEASUREMENT SCALE', 'SAMPLE VALUES'))
        print("-" * 80)
        
        for _, row in analysis_df.iterrows():
            print("{:<25} {:<15} {:<20} {}".format(
                row['Column'],
                row['Data Type'],
                row['Measurement Scale'],
                str(row['Sample Values'])
            ))
        
        print("\n" + "-"*50)

print("\nAnalysis complete!")

# It's possible policing operation may be an empty column. I will verify first.
for month, dfs in DATA_FRAMES.items():
    for idx, df in enumerate(dfs):
        df.columns = df.columns.str.strip()

for month, dfs in DATA_FRAMES.items():
    print(f"Description for {month}:\n")
    
    for idx, df in enumerate(dfs):  # Iterate through each DataFrame in the list
        print(f"Dataset {idx + 1} in {month}:")
        
        # Check if the column exists in the DataFrame
        if 'Policing operation' not in df.columns:
            print("Column 'Policing operation' not found in this dataset.")
            print("Available columns:", df.columns.tolist())  # Print available columns
            continue  # Skip to the next DataFrame
        
        # Filter non-empty policing operations
        filtered_data = df[df['Policing operation'].notna() & (df['Policing operation'] != '')]
        
        # Check if the filtered DataFrame has enough rows before sampling
        if len(filtered_data) >= 3:
            print(filtered_data.sample(n=3, random_state=42))
        elif not filtered_data.empty:
            print(filtered_data)  # Print all available rows if less than 3
        else:
            print("No valid policing operation records found.")
        
        print("\n" + "-"*50 + "\n")
        
for month, dfs in DATA_FRAMES.items():
    for idx, df in enumerate(dfs):
        if 'Policing operation' in df.columns:
            df.drop(columns=['Policing operation'], inplace=True)
            print(f"Dropped 'Policing operation' from Dataset {idx + 1} in {month}.")

# Define the standard columns we expect in each type of dataset
STOP_SEARCH_COLUMN_ID = {
    'Type',
    'Date',
    'Part of a policing operation',
    'Latitude',
    'Longitude',
    'Gender',
    'Age range',
    'Self-defined ethnicity',
    'Officer-defined ethnicity',
    'Legislation',
    'Object of search',
    'Outcome',
    'Outcome linked to object of search',
    'Removal of more than just outer clothing'
}

CRIME_COLUMN_ID = {
    'Crime ID',
    'Month',
    'Reported by',
    'Falls within',
    'Longitude',
    'Latitude',
    'Location',
    'LSOA code',
    'LSOA name',
    'Crime type',
    'Last outcome category',
    'Context'
}

STOP_SEARCH_DATAFRAME = []
CRIME_DATAFRAME = []

# Dictionaries to track mismatched columns:
STOP_SEARCH_MISMATCH = {}
CRIM_MISMATCH = {}

for month, dfs in DATA_FRAMES.items():
    for idx, df in enumerate(dfs):
        # We'll use the presence of "Crime ID" to identify crime data,
        # and the presence of "Type" to identify stop-and-search data.
        #
        # You can make this logic more robust by checking multiple columns,
        # but for simplicity, we'll rely on these distinctive ones.
        
        dataset_key = f"{month}_dataset_{idx+1}"  # For logging mismatch info
        if 'Crime ID' in df.columns:
            missing_cols = CRIME_COLUMN_ID - set(df.columns)
            extra_cols   = set(df.columns) - CRIME_COLUMN_ID
            
            if missing_cols or extra_cols:
                CRIM_MISMATCH[dataset_key] = {
                    'missing_cols': list(missing_cols),
                    'extra_cols': list(extra_cols)
                }
            
            # Reindex the DataFrame so it has at least the known columns
            # (We keep extra columns too, but this ensures consistent ordering)
            combined_cols = CRIME_COLUMN_ID.union(df.columns)  # union of known + existing
            # Sort columns for a cleaner layout (optional)
            combined_cols = sorted(list(combined_cols))
            df = df.reindex(columns=combined_cols)

            # to set the value to 'unknown' of each row in any column where the value is null or empty
            df.fillna('unknown', inplace=True)
            CRIME_DATAFRAME.append(df)
        elif 'Type' in df.columns:
            # CLASSIFY AS STOP-AND-SEARCH DATASET
            missing_cols = STOP_SEARCH_COLUMN_ID - set(df.columns)
            extra_cols   = set(df.columns) - STOP_SEARCH_COLUMN_ID
            
            if missing_cols or extra_cols:
                STOP_SEARCH_MISMATCH[dataset_key] = {
                    'missing_cols': list(missing_cols),
                    'extra_cols': list(extra_cols)
                }
            
            combined_cols = STOP_SEARCH_COLUMN_ID.union(df.columns)
            combined_cols = sorted(list(combined_cols))
            df = df.reindex(columns=combined_cols)
            
            # to set the value to 'unknown' of each row in any column where the value is null or empty
            df.fillna('unknown', inplace=True)
            STOP_SEARCH_DATAFRAME.append(df)
        else:
            # Could not classify this dataset; store it in mismatches or skip
            print(f"Could not classify {dataset_key}. Columns found: {df.columns.tolist()}")
            # Optionally log this in some 'unclassified_mismatch' dict

# Finally, combine each classification into a single DataFrame
if STOP_SEARCH_DATAFRAME:
    stop_and_search_df = pd.concat(STOP_SEARCH_DATAFRAME, ignore_index=True)
else:
    stop_and_search_df = pd.DataFrame()
    print("No stop-and-search datasets were found.")

if CRIME_DATAFRAME:
    crime_df = pd.concat(CRIME_DATAFRAME, ignore_index=True)
else:
    crime_df = pd.DataFrame()
    print("No crime datasets were found.")

print("\n**Stop and Search Mismatch**:", STOP_SEARCH_MISMATCH)
print("\n**Crime Mismatch**:", CRIM_MISMATCH)

print("Stop and Search DataFrames missing values:", pd.isnull(stop_and_search_df).sum(), "\nCrime DataFrames missing values:", pd.isnull(crime_df).sum())

# crime_df.to_csv('crime_data.csv', index=False)
# stop_and_search_df.to_csv('stop_and_search_data.csv', index=False)