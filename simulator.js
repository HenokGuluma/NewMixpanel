const axios = require('axios');
const chalk = require('chalk');
const cron = require('node-cron');
const cliProgress = require('cli-progress');
const { v4: uuidv4 } = require('uuid');

class ContinuousGrowthSimulator {
    constructor() {
        // Mixpanel configuration
        this.token = '06e2db21d289c35e9515e29195c2b659';
        this.apiSecret = '5ef7d71c38072f2acd22abbb75c65439';
        this.baseURL = 'https://api.mixpanel.com';
        
        // Simulation configuration
        this.users = new Map();
        this.totalEvents = 0;
        this.historicalStartDate = new Date('2025-06-04');
        this.currentDate = new Date();
        
        // Growth targets
        this.targetUsers = 15000;
        this.targetOctoberDAU = 5000;
        this.targetOctoberDailyEvents = 100000;
        
        // Track simulation state
        this.historicalDataGenerated = false;
        this.isContinuousMode = false;
        
        // User engagement tracking
        this.userEventCounts = new Map();
        this.userFirstSeen = new Map();
        this.userLastActive = new Map();
        
        // User data arrays
        this.ethiopianFirstNames = [
            'Abel', 'Abebe', 'Addis', 'Alemayehu', 'Amare', 'Ashenafi', 'Bekele', 
            'Berhanu', 'Dawit', 'Elias', 'Endashaw', 'Fisseha', 'Getachew', 'Girma',
            'Haile', 'Henok', 'Kebede', 'Lemma', 'Melaku', 'Mesfin', 'Mulugeta',
            'Negasi', 'Solomon', 'Tadesse', 'Tamrat', 'Tekle', 'Tesfaye', 'Tewodros',
            'Yared', 'Zerihun', 'Alem', 'Alemitu', 'Askale', 'Beza', 'Birtukan',
            'Desta', 'Etenesh', 'Fikirte', 'Genet', 'Hanna', 'Helina', 'Kidan',
            'Konjit', 'Lemlem', 'Marta', 'Meseret', 'Mihret', 'Rahel', 'Selamawit',
            'Senedu', 'Tigist', 'Tirhas', 'Weini', 'Yeshi', 'Zewditu'
        ];

        this.ethiopianLastNames = [
            'Abebe', 'Admassu', 'Alemayehu', 'Assefa', 'Bekele', 'Berhane', 'Desta',
            'Gebre', 'Gebremichael', 'Getachew', 'Haile', 'Hailu', 'Kassa', 'Kebede',
            'Lemma', 'Mamo', 'Melaku', 'Mesfin', 'Mulugeta', 'Negash', 'Solomon',
            'Tadesse', 'Tekle', 'Tesfaye', 'Tsegaye', 'Woldemariam', 'Worku',
            'Yohannes', 'Zerihun'
        ];

        this.ethiopianWords = [
            'addis', 'abeba', 'ethio', 'habesha', 'selam', 'tena', 'buna', 'injera',
            'tibs', 'kitfo', 'doro', 'wat', 'tej', 'lalibela', 'axum', 'gonder',
            'harar', 'omo', 'nile', 'blue', 'awash', 'tana', 'simien', 'ras', 'negus',
            'mesob', 'kenema', 'fidel', 'geez', 'amhara', 'oromo', 'tigray', 'afar',
            'somali', 'gurage', 'sidama', 'welayta', 'hadiya'
        ];

        this.deviceModels = {
            'Samsung': ['SM-G998B', 'SM-S908E', 'SM-S911B', 'SM-A536E', 'SM-A127F', 'SM-A505F'],
            'Tecno': ['Camon 18', 'Spark 8', 'Pova 3', 'Phantom X', 'Camon 17', 'Spark 7']
        };

        this.cities = [
            'Addis Ababa', 'Addis Ababa', 'Adama', 'Addis Ababa', 'Addis Ababa', 
            'Bahir Dar', 'Addis Ababa', 'Mekele', 'Addis Ababa'
        ];

        this.events = [
            'App Open', 'Entered Squad-Mode', 'Deposit-Cash', 'RapidBall-Solo', 
            'Hacker-Solo', 'Maze-Solo', 'Entered-Public-Lobby', 'Discount-Page', 
            'Claimed-Discount', 'Change-Profile', 'Transferred-Gems', 'Purchased-Gems', 
            'Invited Friend', 'Upload-Action', 'Registered', 'Search-Lobby'
        ];

        this.progressBar = new cliProgress.SingleBar({
            format: 'Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} Events',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });
    }

    // CRITICAL: Send user profile with user_id as distinct_id
    async sendUserProfile(user) {
        try {
            const userEngagement = this.userEventCounts.get(user.user_id) || { totalEvents: 0 };
            const lastActive = this.userLastActive.get(user.user_id) || user.first_seen;

            const engageData = {
                '$token': this.token,
                '$distinct_id': user.user_id, // KEY: Same as events
                '$set': {
                    // Basic info
                    '$username': user.username,
                    '$email': user.email,
                    '$phone': user.phone,
                    '$city': user.city,
                    '$country': 'Ethiopia',
                    '$country_code': 'ET',
                    '$name': user.username,
                    '$first_name': user.username.split(' ')[0],
                    '$last_name': user.username.split(' ')[1] || '',
                    
                    // Device info
                    '$device_model': user.device_model,
                    '$manufacturer': user.manufacturer,
                    '$os_version': user.os_version,
                    '$app_version': user.app_version,
                    '$screen_resolution': user.screen_resolution,
                    
                    // Engagement metrics
                    '$first_seen': Math.floor(user.first_seen.getTime() / 1000),
                    '$last_seen': Math.floor(lastActive.getTime() / 1000),
                    'total_events': userEngagement.totalEvents,
                    'user_tenure_days': Math.floor((lastActive - user.first_seen) / (1000 * 60 * 60 * 24)),
                    'is_active': true,
                    'timezone': 'Africa/Addis_Ababa',
                    'last_active_date': lastActive.toISOString().split('T')[0]
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

            if (response.status === 200) {
                console.log(chalk.gray(`   ✅ User profile: ${user.username}`));
                return true;
            }
            return false;
        } catch (error) {
            console.log(chalk.red(`User profile error: ${error.message}`));
            return false;
        }
    }

    // CRITICAL: Send event using user_id as distinct_id
    async sendEvent(user, eventName, eventTime) {
        try {
            // Track user engagement
            if (!this.userEventCounts.has(user.user_id)) {
                this.userEventCounts.set(user.user_id, 0);
                this.userFirstSeen.set(user.user_id, eventTime);
            }
            
            const eventCount = this.userEventCounts.get(user.user_id) + 1;
            this.userEventCounts.set(user.user_id, eventCount);
            this.userLastActive.set(user.user_id, eventTime);
            
            const daysSinceFirstSeen = Math.floor((eventTime - this.userFirstSeen.get(user.user_id)) / (1000 * 60 * 60 * 24));
            const engagementMultiplier = 1.0 + (daysSinceFirstSeen / 100);
            const uniqueDistinctId = `${user.user_id}1`;

            const eventData = {
                event: eventName,
                properties: {
                    'token': this.token,
                    'distinct_id': user.user_id, // KEY: Same as user profile
                    'time': Math.floor(eventTime.getTime() / 1000),
                    
                    // User identifiers
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
                    'screen_resolution': user.screen_resolution,
                    
                    // Session info
                    'session_id': `session_${Math.floor(Math.random() * 1000)}`,
                    'connection_type': ['wifi', 'mobile'][Math.floor(Math.random() * 2)],
                    'battery_level': `${Math.floor(Math.random() * 100)}%`,
                    '$insert_id': uniqueDistinctId,
                    
                    // Engagement
                    'user_tenure_days': daysSinceFirstSeen,
                    'total_user_events': eventCount,
                    
                    // Event-specific properties
                    ...this.getEventSpecificProperties(eventName, engagementMultiplier)
                }
            };

            // Use IMPORT API for historical data, TRACK API for real-time
            const isHistorical = eventTime < new Date(new Date().setHours(0, 0, 0, 0));
            
            if (isHistorical) {
                const response = await axios.post(
                    `${this.baseURL}/import`,
                    [eventData],
                    {
                        params: { strict: 1 },
                        auth: {
                            username: this.apiSecret,
                            password: ''
                        }
                    }
                );
                return response.status === 200;
            } else {
                const response = await axios.post(
                    `${this.baseURL}/track`,
                    eventData,
                    {
                        params: { verbose: 1, ip: 0 }
                    }
                );
                return response.status === 200 && (response.data === 1 || response.data.status === 1);
            }
        } catch (error) {
            console.log(chalk.red(`Event error: ${error.message}`));
            return false;
        }
    }

    // Calculate growth metrics
    calculateGrowthMetrics(targetDate) {
        const historicalEndDate = new Date('2025-10-31');
        const totalHistoricalDays = Math.floor((historicalEndDate - this.historicalStartDate) / (1000 * 60 * 60 * 24));
        const daysSinceStart = Math.floor((targetDate - this.historicalStartDate) / (1000 * 60 * 60 * 24));
        
        let growthFactor;
        
        if (targetDate <= historicalEndDate) {
            if (daysSinceStart < 30) {
                growthFactor = 0.05 + (0.15 * (daysSinceStart / 30));
            } else if (daysSinceStart < 90) {
                const phaseProgress = (daysSinceStart - 30) / 60;
                growthFactor = 0.2 + (0.6 * Math.pow(phaseProgress, 1.8));
            } else {
                const phaseProgress = (daysSinceStart - 90) / (totalHistoricalDays - 90);
                growthFactor = 0.8 + (0.2 * Math.pow(phaseProgress, 0.8));
            }
        } else {
            const daysBeyondHistorical = daysSinceStart - totalHistoricalDays;
            
            if (daysBeyondHistorical < 30) {
                growthFactor = 1.0 + (0.1 * (daysBeyondHistorical / 30));
            } else if (daysBeyondHistorical < 90) {
                const phaseProgress = (daysBeyondHistorical - 30) / 60;
                growthFactor = 1.1 + (0.2 * Math.pow(phaseProgress, 0.7));
            } else {
                const phaseProgress = (daysBeyondHistorical - 90) / 90;
                growthFactor = 1.3 + (0.1 * Math.pow(phaseProgress, 0.5));
            }
            
            growthFactor = Math.min(growthFactor, 2.0);
        }

        let randomFactor = 0.8 + (Math.random() * 0.4);
        if (Math.random() < 0.1) randomFactor *= 0.6 + (Math.random() * 0.3);
        if (Math.random() < 0.05) randomFactor *= 1.2 + (Math.random() * 0.3);

        growthFactor *= randomFactor;

        const totalUsers = Math.floor(this.targetUsers * growthFactor);
        const dailyActiveUsers = Math.floor(this.targetOctoberDAU * growthFactor);
        const dailyEvents = Math.floor(this.targetOctoberDailyEvents * growthFactor);

        const baseEventsPerUser = 5;
        const targetEventsPerUser = targetDate > historicalEndDate ? 25 : 20;
        const engagementProgress = Math.min(daysSinceStart / (totalHistoricalDays * 1.5), 1);
        const eventsPerUser = baseEventsPerUser + ((targetEventsPerUser - baseEventsPerUser) * engagementProgress);

        return {
            totalUsers,
            dailyActiveUsers,
            dailyEvents: Math.floor(dailyEvents * (eventsPerUser / 20)),
            eventsPerUser,
            growthFactor,
            daysSinceStart,
            isFuture: targetDate > historicalEndDate
        };
    }

    // Event-specific properties
    getEventSpecificProperties(eventName, engagementMultiplier) {
        switch (eventName) {
            case 'App Open':
                return {
                    'source': Math.random() > 0.5 ? 'push_notification' : 'app_icon',
                    'session_length_seconds': Math.floor(Math.random() * 300 * engagementMultiplier)
                };
            case 'Entered Squad-Mode':
                return {
                    'squad_size': Math.floor(Math.random() * 4) + 2,
                    'squad_id': `SQ${Math.floor(Math.random() * 10000)}`,
                    'is_private': Math.random() > 0.5
                };
            case 'Deposit-Cash':
                const depositAmount = Math.floor(Math.random() * 1000 * engagementMultiplier) + 10;
                return {
                    'amount': depositAmount,
                    'currency': 'ETB',
                    'payment_method': ['bank_transfer', 'mobile_money', 'credit_card'][Math.floor(Math.random() * 3)],
                    'transaction_id': `TXN${Math.floor(Math.random() * 1000000)}`
                };
            case 'RapidBall-Solo':
            case 'Hacker-Solo':
            case 'Maze-Solo':
                const baseScore = Math.floor(Math.random() * 10000);
                const engagementScore = Math.floor(baseScore * engagementMultiplier);
                return {
                    'level': Math.floor(Math.random() * 50) + 1,
                    'score': engagementScore,
                    'time_spent_seconds': Math.floor(Math.random() * 300 * engagementMultiplier),
                    'powerups_used': Math.floor(Math.random() * 5),
                    'high_score_beaten': engagementScore > 5000
                };
            case 'Purchased-Gems':
                return {
                    'gem_package': ['small', 'medium', 'large', 'mega'][Math.floor(Math.random() * 4)],
                    'cost': [99, 299, 599, 999][Math.floor(Math.random() * 4)],
                    'currency': 'ETB'
                };
            default:
                return {};
        }
    }

    // User generation
    generateUserProfile() {
        const username = this.generateUsername();
        const email = this.generateEmail(username);
        const deviceInfo = this.generateDeviceInfo();
        
        const user_id = `${uuidv4()}`;
        const device_id = `${uuidv4()}`;

        return {
            user_id: user_id,
            device_id: device_id,
            username: username,
            email: email,
            phone: `+2519${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
            city: this.cities[Math.floor(Math.random() * this.cities.length)],
            country: 'Ethiopia',
            age: Math.floor(Math.random() * 20) + 18,
            gender: Math.random() > 0.5 ? 'male' : 'female',
            device_model: deviceInfo.model,
            manufacturer: deviceInfo.manufacturer,
            os_version: deviceInfo.os_version,
            app_version: deviceInfo.app_version,
            screen_resolution: deviceInfo.resolution,
            first_seen: new Date(this.historicalStartDate.getTime() + Math.random() * 150 * 24 * 60 * 60 * 1000)
        };
    }

    generateUsername() {
        const firstName = this.ethiopianFirstNames[Math.floor(Math.random() * this.ethiopianFirstNames.length)];
        const lastName = this.ethiopianLastNames[Math.floor(Math.random() * this.ethiopianLastNames.length)];
        
        const patterns = [
            () => {
                const base = `${firstName.substring(0, 3)}${lastName.substring(0, 3)}`.toLowerCase();
                return Math.random() > 0.3 ? base : `${base}${Math.floor(Math.random() * 90) + 10}`;
            },
            () => `${firstName.toLowerCase()}${lastName.substring(0, 1)}`.toLowerCase(),
            () => `${firstName.substring(0, 1)}${lastName.toLowerCase()}`.toLowerCase(),
            () => {
                const ethWord = this.ethiopianWords[Math.floor(Math.random() * this.ethiopianWords.length)];
                return Math.random() > 0.5 
                    ? `${firstName.substring(0, 2)}${ethWord}`.toLowerCase()
                    : `${ethWord}${lastName.substring(0, 2)}`.toLowerCase();
            },
            () => {
                const shortFirst = this.shortenName(firstName);
                const shortLast = this.shortenName(lastName);
                return `${shortFirst}${shortLast}`.toLowerCase();
            }
        ];

        const username = patterns[Math.floor(Math.random() * patterns.length)]();
        return this.replaceEthiopianCharacters(username);
    }

    generateEmail(username) {
        const emailPatterns = [
            () => {
                const names = username.split('_');
                if (names.length >= 2) {
                    const num = Math.random() > 0.7 ? Math.floor(Math.random() * 100) : '';
                    return `${names[0]}.${names[1]}${num}`.toLowerCase();
                }
                return `${username}${Math.floor(Math.random() * 100)}`.toLowerCase();
            },
            () => {
                const year = Math.random() > 0.5 ? '19' : '20';
                const yearNum = year === '19' 
                    ? Math.floor(Math.random() * 30) + 70
                    : Math.floor(Math.random() * 25);
                return `${username}${year}${yearNum}`.toLowerCase();
            }
        ];

        const emailLocalPart = emailPatterns[Math.floor(Math.random() * emailPatterns.length)]().toLowerCase();
        const cleanEmail = this.replaceEthiopianCharacters(emailLocalPart);
        
        return `${cleanEmail}@gmail.com`;
    }

    shortenName(name) {
        const shorteners = {
            'Alemayehu': 'alem', 'Alemitu': 'alemi', 'Mesfin': 'mesf', 
            'Mulugeta': 'mulu', 'Tadesse': 'tade', 'Tekle': 'tek',
            'Tesfaye': 'tesf', 'Zerihun': 'zeri', 'Selamawit': 'sela',
            'Mihret': 'mihr', 'Kidan': 'kid', 'Henok': 'hen'
        };
        
        return shorteners[name] || name.substring(0, Math.floor(Math.random() * 3) + 3);
    }

    replaceEthiopianCharacters(text) {
        return text
            .replace('yehu', 'yu')
            .replace('ye', 'y')
            .replace('haile', 'hl')
            .replace('kiros', 'kr')
            .replace('michael', 'mic')
            .replace('gabriel', 'gab')
            .replace('kidane', 'kid');
    }

    generateDeviceInfo() {
        const manufacturers = Object.keys(this.deviceModels);
        const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
        const model = this.deviceModels[manufacturer][Math.floor(Math.random() * this.deviceModels[manufacturer].length)];
        
        const resolutions = {
            'Samsung': ['1080x1920', '1440x2560'],
            'Tecno': ['720x1280', '1080x1920']
        };

        return {
            manufacturer: manufacturer,
            model: model,
            os_version: ['Android 13', 'Android 12', 'Android 11'][Math.floor(Math.random() * 3)],
            resolution: resolutions[manufacturer][Math.floor(Math.random() * resolutions[manufacturer].length)],
            app_version: ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '2.0.0'][Math.floor(Math.random() * 5)]
        };
    }

    // Main simulation methods
    async simulateDay(targetDate) {
        const metrics = this.calculateGrowthMetrics(targetDate);
        
        console.log(chalk.blue(`\n📊 Simulating ${targetDate.toISOString().split('T')[0]}:`));
        console.log(chalk.gray(`   Total Users: ${metrics.totalUsers.toLocaleString()}`));
        console.log(chalk.gray(`   Daily Active Users: ${metrics.dailyActiveUsers.toLocaleString()}`));
        console.log(chalk.gray(`   Daily Events: ${metrics.dailyEvents.toLocaleString()}`));

        // Ensure we have enough users
        while (this.users.size < metrics.totalUsers) {
            const user = this.generateUserProfile();
            this.users.set(user.user_id, user);
        }

        const usersArray = Array.from(this.users.values());
        const dailyEvents = metrics.dailyEvents;
        
        console.log(chalk.gray(`   Generating ${dailyEvents.toLocaleString()} events...`));

        this.progressBar.start(dailyEvents, 0);

        let successCount = 0;
        const activeUsersToday = new Set();

        // Send user profiles first
        console.log(chalk.yellow('   Sending user profiles...'));
        for (let i = 0; i < Math.min(usersArray.length, 1000); i++) {
            const user = usersArray[i];
            await this.sendUserProfile(user);
            if (i % 100 === 0) {
                await this.delay(1000);
            }
        }

        // Generate and send events
        for (let i = 0; i < dailyEvents; i++) {
            const user = usersArray[Math.floor(Math.random() * usersArray.length)];
            const eventName = this.events[Math.floor(Math.random() * this.events.length)];
            
            // Distribute events throughout the day
            const hour = Math.floor(Math.random() * 24);
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);
            const eventTime = new Date(targetDate);
            eventTime.setHours(hour, minute, second, 0);

            const success = await this.sendEvent(user, eventName, eventTime);
            if (success) {
                successCount++;
                activeUsersToday.add(user.user_id);
            }

            // Update progress
            if (i % 100 === 0) {
                this.progressBar.update(i);
                await this.delay(100);
            }
        }

        this.progressBar.stop();

        // Final user profile updates
        console.log(chalk.yellow('   Updating user engagement data...'));
        for (let userId of activeUsersToday) {
            const user = this.users.get(userId);
            if (user) {
                await this.sendUserProfile(user);
            }
        }

        this.totalEvents += successCount;
        console.log(chalk.green(`   ✅ ${successCount.toLocaleString()}/${dailyEvents.toLocaleString()} events sent`));
        console.log(chalk.green(`   👥 ${activeUsersToday.size.toLocaleString()} active users`));
        
        return successCount;
    }

    async generateHistoricalData() {
        if (this.historicalDataGenerated) {
            console.log(chalk.yellow('📚 Historical data already generated, skipping...'));
            return;
        }

        console.log(chalk.cyan('\n📚 Generating Historical Data (June 04 - October 31, 2025)...'));
        
        const historicalEndDate = new Date('2025-11-12');
        let currentDate = new Date(this.historicalStartDate);
        let totalSent = 0;

        while (currentDate <= historicalEndDate) {
            const sent = await this.simulateDay(currentDate);
            totalSent += sent;
            currentDate.setDate(currentDate.getDate() + 1);
            
            await this.delay(2000);
        }

        this.historicalDataGenerated = true;
        console.log(chalk.green(`🎉 Historical data completed!`));
        console.log(chalk.green(`   Total events: ${totalSent.toLocaleString()}`));
        console.log(chalk.green(`   Total users: ${this.users.size.toLocaleString()}`));
    }

    startFutureContinuousMode() {
        console.log(chalk.cyan('\n🔮 Starting Future Continuous Mode...'));
        console.log(chalk.cyan('   Running daily at 8 AM UTC for current and future dates'));
        
        this.isContinuousMode = true;

        // Schedule daily runs
        cron.schedule('0 8 * * *', async () => {
            console.log(chalk.blue('\n--- Daily Simulation Cycle ---'));
            
            const today = new Date();
            await this.simulateDay(today);
            
            console.log(chalk.blue('--- Daily Simulation Complete ---\n'));
        });

        // Also run immediately for today
        console.log(chalk.yellow('🔄 Generating data for today...'));
        this.simulateDay(new Date());

        console.log(chalk.green('✅ Future continuous mode activated!'));
        
        this.keepAlive();
    }

    keepAlive() {
        setInterval(() => {
            if (this.isContinuousMode) {
                const now = new Date();
                const metrics = this.calculateGrowthMetrics(now);
                console.log(chalk.gray(`   💫 Continuous mode active | Users: ${metrics.totalUsers.toLocaleString()} | Next run: 8 AM UTC`));
            }
        }, 60000);
    }

    async runCompleteSimulation() {
        console.log(chalk.cyan('🚀 Starting Complete Simulation'));
        console.log(chalk.cyan(`   Historical: June 04, 2025 - October 31, 2025`));
        console.log(chalk.cyan(`   Continuous: November 01, 2025 - Ongoing`));
        
        await this.generateHistoricalData();
        this.startFutureContinuousMode();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Health server
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'Mixpanel Growth Simulator',
        timestamp: new Date().toISOString()
    }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Health server running on port ${PORT}`);
});

// Main execution
async function main() {
    const simulator = new ContinuousGrowthSimulator();
    await simulator.runCompleteSimulation();
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Received shutdown signal...'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Received termination signal...'));
    process.exit(0);
});

main().catch(console.error);