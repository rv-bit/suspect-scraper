import 'dotenv/config';
import { pool } from '~/server/database/index';

export async function trainModel() {
    const client = await pool.connect();

    try {
        await client.query('SET statement_timeout = 0');
        await client.query('SET idle_in_transaction_session_timeout = 0');

        const modelsExist = await client.query(`
            SELECT COUNT(*) FROM pgml.models WHERE project_id = (SELECT id FROM pgml.projects WHERE name = 'crime_prediction');
        `);

        if (modelsExist.rows[0].count > 0) {
            console.log('⚠️ Models already exist. Skipping model creation.');
            return;
        }

        // console.log('🔄 Cleaning up old models...');
        // await client.query(`
        //     DELETE FROM pgml.models WHERE project_id = (SELECT id FROM pgml.projects WHERE name = 'crime_prediction');
        //     DELETE FROM pgml.projects WHERE name = 'crime_prediction';
        // `);

        console.log('📦 Dropping old view and table...');
        await client.query('DROP VIEW IF EXISTS public.crime_features');
        await client.query('DROP TABLE IF EXISTS big_data.crime_data_features_table');

        console.log('🛠 Creating features table...');
        await client.query(`
            CREATE TABLE big_data.crime_data_features_table (
                year INTEGER,
                month INTEGER,
                crime_count INTEGER,
                crime_type TEXT
            );
        `);

        console.log('📥 Inserting cleaned data...');
        await client.query(`
            INSERT INTO big_data.crime_data_features_table (year, month, crime_count, crime_type)
            SELECT
                EXTRACT(YEAR FROM TO_DATE(month, 'YYYY-MM'))::INTEGER,
                EXTRACT(MONTH FROM TO_DATE(month, 'YYYY-MM'))::INTEGER,
                COUNT(*)::INTEGER,
                LOWER(TRIM(crime_type)) AS crime_type
            FROM big_data.crime_data
            WHERE crime_type IS NOT NULL AND TRIM(crime_type) != ''
            GROUP BY 1, 2, 4
        `);

        console.log('📤 Creating view...');
        await client.query(`
            CREATE OR REPLACE VIEW public.crime_features AS
            SELECT * FROM big_data.crime_data_features_table
            WHERE crime_count IS NOT NULL AND crime_type IS NOT NULL
        `);

        console.log('🔎 Validating schema and values...');
        const schema = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crime_data_features_table'
        `);
        console.log('📊 Feature table schema:', schema.rows);

        const nullCheck = await client.query(`
            SELECT COUNT(*) FROM public.crime_features WHERE crime_count IS NULL
        `);
        console.log('Nulls in crime_count:', nullCheck.rows[0].count);

        const crimeTypes = await client.query(`
            SELECT DISTINCT crime_type FROM public.crime_features ORDER BY 1
        `);
        console.log('Unique crime types:', crimeTypes.rows.length);

        console.log('⚙️ Setting search path...');
        await client.query('SET search_path TO pgml, public');

        console.log('🚀 Starting training...');
        const preprocessJson = `{
            "year": { "scale": "standard" },
            "month": { "scale": "standard" },
            "crime_type": { "impute": "mode", "encode": "one_hot" }
        }`;

        const result = await client.query(`
            SELECT * FROM pgml.train(
                project_name      => 'crime_prediction',
                task              => 'regression',
                relation_name     => 'public.crime_features',
                y_column_name     => 'crime_count',
                algorithm         => 'xgboost'
            );
        `);

        console.log('✅ Training complete:', result.rows[0]);
    } catch (err) {
        console.error('❌ Error during training:', err);
    } finally {
        console.log('🧹 Releasing DB client');
        client.release();
    }
}

const crimeTypeMapping = {
    "criminal damage and arson": 0,
    "theft from the person": 1,
    "other crime": 2,
    "shoplifting": 3,
    "violence and sexual offences": 4,
    "public order": 5,
    "drugs": 6,
    "burglary": 7,
    "anti-social behaviour": 8,
    "vehicle crime": 9,
    "other theft": 10,
    "robbery": 11,
    "bicycle theft": 12,
    "possession of weapons": 13
};

export async function predictCrimeCount(year: number, month: number, crimeType: string) {
    const client = await pool.connect();

    try {
        // Map crime type to corresponding numeric value
        const crimeTypeEncoded = crimeTypeMapping[crimeType as keyof typeof crimeTypeMapping];

        if (crimeTypeEncoded === undefined) {
            console.error('Invalid crime type');
            return;
        }

        // Create a one-hot encoded vector of length 14 for the crime type
        const crimeTypeOneHot = new Array(14).fill(0);
        crimeTypeOneHot[crimeTypeEncoded] = 1;

        const featureVector = [year, month, ...crimeTypeOneHot];
        const result = await client.query(`
            SELECT
                pgml.predict(
                    'crime_prediction',
                    ARRAY[${featureVector.map(value => `${value}`).join(',')}]::real[]
                ) AS predicted_crime_count;
        `);

        // Display the result
        if (result.rows.length > 0) {
            console.log(`Predicted crime count for ${crimeType} in ${month}-${year}:`, result.rows[0].predicted_crime_count);
        } else {
            console.log('No prediction result found.');
        }

    } catch (error) {
        console.error('❌ Error predicting crime count:', error);
    } finally {
        client.release();
    }
}

export async function getAvailableCrimeTypes(): Promise<string[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT DISTINCT crime_type FROM public.crime_features;
        `);
        return result.rows.map(row => row.crime_type);
    } catch (error) {
        console.error('Error fetching crime types:', error);
        return [];
    } finally {
        client.release();
    }
}