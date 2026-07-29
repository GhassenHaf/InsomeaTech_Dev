const db = require('./database');

class SystemSetting {
    static async getTTNConfig() {
        const result = await db.query(`
            SELECT setting_key, setting_value FROM insomea_tech.system_settings 
            WHERE setting_key IN ('ttn_arg0', 'ttn_arg1', 'ttn_arg2')
        `);
        
        const config = {
            arg0: 'INSE', // Defaults
            arg1: 'ynamp;',
            arg2: '15M000'
        };

        result.rows.forEach(row => {
            if (row.setting_key === 'ttn_arg0') config.arg0 = row.setting_value;
            if (row.setting_key === 'ttn_arg1') config.arg1 = row.setting_value;
            if (row.setting_key === 'ttn_arg2') config.arg2 = row.setting_value;
        });

        return config;
    }

    static async initTable() {
        await db.query(`
            CREATE TABLE IF NOT EXISTS insomea_tech.system_settings (
                setting_key VARCHAR(255) PRIMARY KEY,
                setting_value TEXT,
                description TEXT,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            INSERT INTO insomea_tech.system_settings (setting_key, setting_value, description)
            VALUES 
                ('ttn_arg0', 'INSE', 'TTN Submission Arg0'),
                ('ttn_arg1', 'ynamp;', 'TTN Submission Arg1'),
                ('ttn_arg2', '15M000', 'TTN Submission Arg2')
            ON CONFLICT (setting_key) DO NOTHING;
        `);
    }
}

module.exports = SystemSetting;
