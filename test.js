const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class SimpleTestSimulator {
    constructor() {
        this.token = '06e2db21d289c35e9515e29195c2b659';
        this.apiSecret = '5ef7d71c38072f2acd22abbb75c65439';
        this.baseURL = 'https://api.mixpanel.com';
        
        // Three test users
        this.testUsers = [
            this.createUser('TestUser1'),
            this.createUser('TestUser2'), 
            this.createUser('TestUser3')
        ];
    }

    createUser(username) {
        const userId = uuidv4();
        return {
            user_id: userId,
            device_id: uuidv4(),
            username: username,
            email: `${username.toLowerCase()}@test.com`,
            phone: `+2519${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
            city: 'Addis Ababa',
            device_model: 'Test Device',
            manufacturer: 'Test Manufacturer',
            os_version: 'Android 13',
            app_version: '2.0.0',
            screen_resolution: '1080x1920',
            first_seen: new Date('2025-11-06')
        };
    }

    // CRITICAL: Send user profile EXACTLY like Flutter
    async sendUserProfile(user) {
        try {
            const engageData = {
                '$token': this.token,
                '$distinct_id': user.user_id, // This is the key - same as events
                '$set': {
                    '$username': user.username,
                    '$email': user.email,
                    '$phone': user.phone,
                    '$city': user.city,
                    '$country': 'Ethiopia',
                    '$first_name': user.username,
                    '$device_model': user.device_model,
                    '$manufacturer': user.manufacturer,
                    '$os_version': user.os_version,
                    '$app_version': user.app_version,
                    '$first_seen': Math.floor(user.first_seen.getTime() / 1000),
                    '$last_seen': Math.floor(user.first_seen.getTime() / 1000),
                    'timezone': 'Africa/Addis_Ababa',
                    'is_test_user': true
                }
            };

            const data = Buffer.from(JSON.stringify(engageData)).toString('base64');
            
            const response = await axios.post(
                `${this.baseURL}/engage`,
                null,
                {
                    params: { 
                        data: data,
                        verbose: 1
                    },
                    auth: {
                        username: this.apiSecret,
                        password: ''
                    }
                }
            );

            console.log(`✅ User profile sent: ${user.username}`);
            return response.status === 200;
        } catch (error) {
            console.log(`❌ User profile error for ${user.username}:`, error.response?.data || error.message);
            return false;
        }
    }

    // CRITICAL: Send event EXACTLY like Flutter - using Track API but with historical timestamp
    async sendEvent(user, eventName, eventTime) {
        try {
            // Generate unique event ID like Flutter
            const eventId = `${user.user_id}-${this.generateEventId()}`;
            const uniqueDistinctId = `${user.user_id}1`;
            
            const eventData = {
                event: eventName,
                properties: {
                    'token': this.token,
                    'distinct_id': user.user_id, // MUST match user profile distinct_id
                    'time': Math.floor(eventTime.getTime() / 1000), // Historical timestamp
                    
                    // User identifiers - Mixpanel uses these to link to profile
                    'user_id': user.user_id,
                    'device_id': user.device_id,
                    'username': user.username,
                    'email': user.email,
                    'city': user.city,
                    'country': 'Ethiopia',
                    
                    // Device info
                    'device_model': user.device_model,
                    'manufacturer': user.manufacturer,
                    'os_version': user.os_version,
                    'app_version': user.app_version,
                    
                    // Session info
                    'session_id': `test_session_${eventId}`,
                    'connection_type': 'wifi',
                    '$insert_id': uniqueDistinctId,
                    
                    // Event-specific
                    'test_event': true,
                    'event_sequence': eventId
                }
            };

            // Use IMPORT API for historical data with explicit timestamp
            const importData = [eventData];
            
            const response = await axios.post(
                `${this.baseURL}/import`,
                importData,
                {
                    params: {
                        strict: 1
                    },
                    auth: {
                        username: this.apiSecret,
                        password: ''
                    }
                }
            );

            console.log(`✅ Event sent: ${eventName} for ${user.username}`);
            return response.status === 200;
        } catch (error) {
            console.log(`❌ Event error for ${user.username}:`, error.response?.data || error.message);
            return false;
        }
    }

    generateEventId() {
        const parts = [
            this.randomString(8),
            this.randomString(4), 
            this.randomString(4),
            this.randomString(12)
        ];
        return parts.join('-');
    }

    randomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Main test function
    async runTest() {
        console.log('🚀 Starting Simple Test - 3 Users, 3 Events Each');
        console.log('📅 Date: November 06, 2025');
        console.log('==============================================');

        const eventDate = new Date('2025-11-06');
        const events = ['App Open', 'Entered Squad-Mode', 'RapidBall-Solo'];

        // Step 1: Send all user profiles first
        console.log('\n1. Sending User Profiles...');
        for (const user of this.testUsers) {
            await this.sendUserProfile(user);
            await this.delay(1000); // Rate limiting
        }

        // Step 2: Send events for each user
        console.log('\n2. Sending Events...');
        for (const user of this.testUsers) {
            console.log(`\n   User: ${user.username}`);
            
            for (let i = 0; i < 3; i++) {
                const eventName = events[i];
                // Distribute events throughout the day
                const eventTime = new Date(eventDate);
                eventTime.setHours(10 + i, 30 * i, 0, 0); // 10:00, 11:30, 13:00
                
                await this.sendEvent(user, eventName, eventTime);
                await this.delay(1500); // Rate limiting
            }
        }

        console.log('\n==============================================');
        console.log('✅ Test Complete!');
        console.log('Check Mixpanel in 5-10 minutes:');
        console.log('1. Go to Users section');
        console.log('2. Search for TestUser1, TestUser2, TestUser3');
        console.log('3. Each should show 3 events on November 06, 2025');
        console.log('==============================================');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the test
async function main() {
    const simulator = new SimpleTestSimulator();
    await simulator.runTest();
}

main().catch(console.error);