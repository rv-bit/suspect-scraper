import 'dotenv/config';

import { sql } from 'drizzle-orm';
import { db, pool } from '~/server/database/index';

export async function trainModel() {
    await db.execute(sql`DROP TABLE IF EXISTS big_data.crime_data_features_table;`);
    
    await db.execute(sql`
        CREATE TABLE big_data.crime_data_features_table AS
        SELECT
            EXTRACT(YEAR FROM TO_DATE(month, 'YYYY-MM')) AS year,
            EXTRACT(MONTH FROM TO_DATE(month, 'YYYY-MM')) AS month,
            COUNT(*) AS crime_count,
            lsoa_code,
            crime_type
        FROM big_data.crime_data
        GROUP BY 1, 2, 4, 5
        LIMIT 100000; -- Limit to 100,000 rows for training 
    `);

    await db.execute(sql`
        CREATE OR REPLACE VIEW public.crime_features AS
        SELECT * FROM big_data.crime_data_features;
    `);

    const existing = await db.execute(
        sql`SELECT 1 FROM pgml.projects WHERE name = 'crime_prediction' LIMIT 1;`
    );
    
    if (existing.rows.length > 0) {
        console.log('Model already exists, skipping training.');
        return;
    }

    // based on PostgresML docs, the proper format for preprocessors is:
    const preprocessJson = `{
        "year": {"scale": "standard"},
        "month": {"scale": "standard"},
        "lsoa_code": {"encode": "one_hot"},
        "crime_type": {"encode": "one_hot"}
    }`;

    const client = await pool.connect();

    try {
        console.log('Training model...');

        await client.query('SET search_path TO pgml, public;');
        await client.query('SET statement_timeout = 0;');

        const result = await client.query(`
            SELECT * FROM pgml.train(
                project_name      => 'crime_prediction',
                task              => 'regression',
                relation_name     => 'public.crime_features',
                y_column_name     => 'crime_count',
                algorithm         => 'xgboost',
                hyperparams       => '{}'::jsonb,
                search            => NULL,
                search_params     => '{}'::jsonb,
                search_args       => '{}'::jsonb,
                test_size         => 0.25,
                test_sampling     => 'random',
                preprocess        => '${preprocessJson}'::jsonb
            );
        `);

        console.log('Training result:', result.rows[0]);
        console.log('✅ Crime model training command executed');
    } catch (error) {
        console.error('Error training model:', error);

        try {
            console.log('Trying with minimal configuration...');
            await client.query('SET search_path TO pgml, public;');
            await client.query('SET statement_timeout = 0;');

            const result = await client.query(`
                SELECT * FROM pgml.train(
                    project_name => 'crime_prediction',
                    task => 'regression',
                    relation_name => 'public.crime_features',
                    y_column_name => 'crime_count',
                    algorithm => 'xgboost'
                );
            `);

            console.log('Training result with minimal config:', result.rows[0]);
            console.log('✅ Crime model trained successfully with minimal config.');
        } catch (fallbackError) {
            console.error('Fallback approach also failed:', fallbackError);
        }
    }
}
