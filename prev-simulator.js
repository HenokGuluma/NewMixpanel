const axios = require('axios');
const chalk = require('chalk');
const cron = require('node-cron');
const cliProgress = require('cli-progress');
const { v4: uuidv4 } = require('uuid');

class EthiopianGrowthSimulator {
    constructor() {
        // Mixpanel configuration
        this.token = '4dc964046f8bcc6d8b35c0ef77724a1d';
        this.apiSecret = 'eeacf1414ba5603875988f314212a2a9'; // REPLACE WITH YOUR ACTUAL API SECRET
        this.baseURL = 'https://api.mixpanel.com';
        
        // FIXED: Simulation configuration for realistic growth
        this.users = new Map();
        this.totalEvents = 0;
        this.simulationStartDate = new Date('2025-06-04');
        this.simulationEndDate = new Date('2025-10-31');
        this.targetUsers = 15000; // Target 15,000 total users
        this.targetOctoberDAU = 5000; // Target 5,000 daily active users by October
        this.targetOctoberDailyEvents = 100000; // Target 100,000 daily events by October
        
        // [Keep all the same username generation, device, and event code]
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
            'Samsung': ['SM-G998B', 'SM-S908E', 'SM-S911B', 'SM-A536E', 'SM-A127F', 'SM-A505F'],
            'Samsung': ['SM-G998B', 'SM-S908E', 'SM-S911B', 'SM-A536E', 'SM-A127F', 'SM-A505F'],
            'Tecno': ['Camon 18', 'Spark 8', 'Pova 3', 'Phantom X', 'Camon 17', 'Spark 7'],
            // 'Infinix': ['Hot 12', 'Note 12', 'Zero X', 'Smart 6', 'Hot 11', 'Note 11'],
            // 'Xiaomi': ['Redmi Note 11', 'POCO X4', 'Redmi 10C', 'Redmi A1', 'Redmi 9', 'POCO M4'],
            // 'Huawei': ['Y9a', 'P40 Lite', 'Nova 9', 'Mate 50', 'Y7a', 'P30 Lite']
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

        this.sentUserProfiles = new Set();
    }

    // FIXED: Realistic exponential growth calculation
    calculateGrowthMetrics(targetDate) {
        const totalDays = Math.floor((this.simulationEndDate - this.simulationStartDate) / (1000 * 60 * 60 * 24));
        const daysSinceStart = Math.floor((targetDate - this.simulationStartDate) / (1000 * 60 * 60 * 24));
        
        // Exponential growth curve with realistic variations
        let growthFactor;
        if (daysSinceStart < 30) {
            // Slow initial adoption (first month)
            growthFactor = 0.05 + (0.15 * (daysSinceStart / 30));
        } else if (daysSinceStart < 90) {
            // Exponential growth phase (months 2-3)
            const phaseProgress = (daysSinceStart - 30) / 60;
            growthFactor = 0.2 + (0.6 * Math.pow(phaseProgress, 1.8));
        } else {
            // Rapid growth to target (months 4-5)
            const phaseProgress = (daysSinceStart - 90) / (totalDays - 90);
            growthFactor = 0.8 + (0.2 * Math.pow(phaseProgress, 0.8));
        }

        // Add realistic randomness: ±20% variation with occasional dips
        let randomFactor = 0.8 + (Math.random() * 0.4);
        
        // Occasional dips (10% chance of a bad day)
        if (Math.random() < 0.1) {
            randomFactor *= 0.6 + (Math.random() * 0.3); // 30-50% reduction
        }
        // Occasional spikes (5% chance of a great day)
        if (Math.random() < 0.05) {
            randomFactor *= 1.2 + (Math.random() * 0.3); // 20-50% increase
        }

        growthFactor *= randomFactor;
        growthFactor = Math.min(growthFactor, 1.0);

        // Calculate metrics based on growth factor
        const totalUsers = Math.floor(this.targetUsers * growthFactor);
        const dailyActiveUsers = Math.floor(this.targetOctoberDAU * growthFactor);
        const dailyEvents = Math.floor(this.targetOctoberDailyEvents * growthFactor);

        // Calculate engagement growth (events per user increases over time)
        const baseEventsPerUser = 5; // Start with 5 events per user
        const targetEventsPerUser = 20; // Grow to 20 events per user
        const engagementProgress = Math.min(daysSinceStart / totalDays, 1);
        const eventsPerUser = baseEventsPerUser + ((targetEventsPerUser - baseEventsPerUser) * engagementProgress);

        return {
            totalUsers,
            dailyActiveUsers,
            dailyEvents,
            eventsPerUser,
            growthFactor,
            daysSinceStart
        };
    }

    // [Keep all the same username, email, device generation methods]
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
            },
            () => Math.random() > 0.5
                ? `${firstName.substring(0, 2)}_${lastName.substring(0, 3)}`.toLowerCase()
                : `${firstName.substring(0, 3)}_${lastName.substring(0, 2)}`.toLowerCase(),
            () => {
                const ethWord = this.ethiopianWords[Math.floor(Math.random() * this.ethiopianWords.length)];
                return `${ethWord}${lastName.substring(0, Math.floor(Math.random() * 3) + 1)}`.toLowerCase();
            },
            () => {
                const descriptors = ['king', 'queen', 'star', 'pro', 'max', 'gold', 'silver', 'real', 'official'];
                const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
                return Math.random() > 0.5
                    ? `${firstName.toLowerCase()}${descriptor}`
                    : `${lastName.toLowerCase()}${descriptor}`;
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
            },
            () => {
                const parts = username.split(/[_.]/);
                if (parts.length >= 2) {
                    return `${parts[0].substring(0, 1)}${parts[1]}`.toLowerCase();
                }
                return `${username.substring(0, 4)}${Math.floor(Math.random() * 1000)}`.toLowerCase();
            },
            () => {
                const middleInitials = ['a', 'b', 'k', 'm', 's', 't'];
                const middle = middleInitials[Math.floor(Math.random() * middleInitials.length)];
                const parts = username.split('_');
                if (parts.length >= 2) {
                    return `${parts[0]}.${middle}.${parts[1]}`.toLowerCase();
                }
                return `${username}.${middle}`.toLowerCase();
            }
        ];

        const emailLocalPart = emailPatterns[Math.floor(Math.random() * emailPatterns.length)]().toLowerCase();
        const cleanEmail = this.replaceEthiopianCharacters(emailLocalPart);
        
        const domains = ['gmail.com'];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        
        return `${cleanEmail}@${domain}`;
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
            'Tecno': ['720x1280', '1080x1920'],
            'Infinix': ['720x1280', '1080x1920'],
            'Xiaomi': ['1080x1920', '1440x2560'],
            'Huawei': ['1080x1920', '1440x2560']
        };

        return {
            manufacturer: manufacturer,
            model: model,
            os_version: ['Android 13', 'Android 12', 'Android 11'][Math.floor(Math.random() * 3)],
            resolution: resolutions[manufacturer][Math.floor(Math.random() * resolutions[manufacturer].length)],
            app_version: ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '2.0.0'][Math.floor(Math.random() * 5)]
        };
    }

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
            first_seen: new Date(this.simulationStartDate.getTime() + Math.random() * 150 * 24 * 60 * 60 * 1000),
            profile_sent: false
        };
    }

    // FIXED: Simulate one day with realistic user growth and event volume
    async simulateDay(targetDate) {
        const metrics = this.calculateGrowthMetrics(targetDate);
        
        console.log(chalk.blue(`\n📊 Simulating ${targetDate.toISOString().split('T')[0]}:`));
        console.log(chalk.gray(`   Total Users: ${metrics.totalUsers}`));
        console.log(chalk.gray(`   Daily Active Users: ${metrics.dailyActiveUsers}`));
        console.log(chalk.gray(`   Daily Events: ${metrics.dailyEvents}`));
        console.log(chalk.gray(`   Avg Events per User: ${metrics.eventsPerUser.toFixed(1)}`));

        // FIXED: Generate enough users to reach target
        while (this.users.size < metrics.totalUsers) {
            const user = this.generateUserProfile();
            this.users.set(user.user_id, user);
        }

        const usersArray = Array.from(this.users.values());
        
        // FIXED: Use calculated daily events instead of engagement-based calculation
        const dailyEvents = metrics.dailyEvents;
        
        console.log(chalk.gray(`   Generating ${dailyEvents} events...`));

        this.progressBar.start(dailyEvents, 0);

        const events = [];
        const now = new Date();
        const isHistorical = targetDate.toDateString() !== now.toDateString();

        // Generate events for the day
        for (let i = 0; i < dailyEvents; i++) {
            const user = usersArray[Math.floor(Math.random() * usersArray.length)];
            const eventName = this.events[Math.floor(Math.random() * this.events.length)];
            
            // Distribute events throughout the day
            const hour = Math.floor(Math.random() * 24);
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);
            const eventTime = new Date(targetDate);
            eventTime.setHours(hour, minute, second, 0);

            const event = this.generateEvent(user, eventName, eventTime);
            events.push(event);
            
            // Ensure user profile is sent
            if (!user.profile_sent) {
                await this.sendUserProfile(user);
                user.profile_sent = true;
            }

            this.progressBar.update(i + 1);
        }

        this.progressBar.stop();

        // Send events in batches
        let successCount = 0;
        const batchSize = 50;

        if (isHistorical && this.apiSecret !== 'YOUR_API_SECRET_HERE') {
            console.log(chalk.yellow(`   📅 Using Import API for historical date`));
            
            for (let i = 0; i < events.length; i += batchSize) {
                const batch = events.slice(i, i + batchSize);
                const success = await this.sendViaImportAPI(batch);
                if (success) {
                    successCount += batch.length;
                } else {
                    console.log('failed here');
                }
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } else {
            console.log(chalk.yellow(`   ⚡ Using Track API`));
            
            for (let i = 0; i < events.length; i += batchSize) {
                const batch = events.slice(i, i + batchSize);
                const batchPromises = batch.map(event => this.sendViaTrackAPI(event));
                
                const results = await Promise.allSettled(batchPromises);
                successCount += results.filter(result => result.value === true).length;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        this.totalEvents += successCount;
        console.log(chalk.green(`   ✅ ${successCount}/${dailyEvents} events sent successfully`));
        
        return successCount;
    }

    // [Keep all the same event generation, API methods, and user profile sending]
    generateEvent(user, eventName, eventTime) {
        const daysSinceFirstSeen = Math.floor((eventTime - user.first_seen) / (1000 * 60 * 60 * 24));
        const engagementMultiplier = 1.0 + (daysSinceFirstSeen / 100);

        const distinct_id = `${uuidv4()}`;
        const eventTimestamp = Math.floor(eventTime.getTime() / 1000);
        
        const baseProperties = {
            'token': this.token,
            'distinct_id': distinct_id,
            'Distinct ID': distinct_id,
            'time': Math.floor(eventTime.getTime() / 1000),
            '$time_processed_utc': eventTime,
            '$user_id': user.user_id,
            '$device_id': user.device_id,
            '$username': user.username,
            '$email': user.email,
            '$city': user.city,
            '$country': 'Ethiopia',
            '$country_code': 'ET',
            '$operating_system': 'Android',
            '$insert_id': distinct_id,
            '$device_model': user.device_model,
            'Manufacturer': user.manufacturer,
            '$os_version': user.os_version,
            '$app_version': user.app_version,
            '$screen_resolution': user.screen_resolution,
            '$session_id': `S${Math.floor(Math.random() * 1000000)}`,
            '$connection_type': Math.random() > 0.5 ? 'wifi' : 'mobile',
            '$battery_level': `${Math.floor(Math.random() * 100)}%`,
            '$user_tenure_days': daysSinceFirstSeen,
            '$engagement_multiplier': engagementMultiplier.toFixed(2),
            '$historical_timestamp': eventTimestamp,
            '$original_event_time': eventTime.toISOString()
        };

        const eventProperties = this.getEventSpecificProperties(eventName, engagementMultiplier);
        
        return {
            event: eventName,
            properties: { ...baseProperties, ...eventProperties }
        };
    }

    getEventSpecificProperties(eventName, engagementMultiplier) {
        switch (eventName) {
            case 'App Open':
                return {
                    'source': Math.random() > 0.5 ? 'push_notification' : 'app_icon',
                    'session_length_seconds': Math.floor(Math.random() * 300 * engagementMultiplier),
                    'previous_session_length': `${Math.floor(Math.random() * 300)}s`
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

    async sendViaImportAPI(events) {
        try {
            const response = await axios.post(
                `${this.baseURL}/import`,
                events,
                {
                    auth: {
                        username: this.apiSecret,
                        password: ''
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    params: {
                        strict: 1
                    }
                }
            );
            
            if (response.status === 200) {
                if (Array.isArray(response.data)) {
                    return response.data.every(result => result === 1 || result.status === 1);
                    console.log('success here');
                } else {
                    return response.data === 1 || (response.data && response.data.status === 1);
                    console.log('major failure');
                }
            }
            return false;
        } catch (error) {
            console.log(chalk.red('Import API Error:'), error.response?.data || error.message);
            return false;
        }
    }

    async sendViaTrackAPI(eventData) {
        try {
            const data = Buffer.from(JSON.stringify(eventData)).toString('base64');
            const response = await axios.get(`${this.baseURL}/track?data=${data}&verbose=1`);
            return response.data === 1 || (response.data && response.data.status === 1);
        } catch (error) {
            return false;
        }
    }

    async sendUserProfile(user) {
        if (this.sentUserProfiles.has(user.user_id)) {
            return true;
        }

        try {
            const engageData = {
                '$token': this.token,
                '$distinct_id': user.user_id,
                '$set': {
                    '$username': user.username,
                    '$email': user.email,
                    '$phone': user.phone,
                    '$city': user.city,
                    '$region': user.city,
                    '$city': user.city,
                    // 'City': user.city,
                    '$name': user.username,
                    // 'Country': 'Ethiopia',
                    '$country': 'Ethiopia',
                    '$country_code': 'ET',
                    '$age': user.age,
                    '$gender': user.gender,
                    '$device_model': user.device_model,
                    '$manufacturer': user.manufacturer,
                    '$os_version': user.os_version,
                    '$app_version': user.app_version,
                    '$screen_resolution': user.screen_resolution,
                    '$first_seen': Math.floor(user.first_seen.getTime() / 1000),
                    '$last_seen': Math.floor(Date.now() / 1000),
                    '$signup_date': Math.floor(user.first_seen.getTime() / 1000),
                    '$timezone': 'Africa/Addis_Ababa'
                }
            };

            const data = Buffer.from(JSON.stringify(engageData)).toString('base64');
            const response = await axios.post(
                `${this.baseURL}/engage`,
                null,
                {
                    params: { data: data },
                    auth: {
                        username: this.apiSecret,
                        password: ''
                    }
                }
            );

            if (response.status === 200) {
                this.sentUserProfiles.add(user.user_id);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // FIXED: Generate historical data with proper growth
    async generateHistoricalData() {
        console.log(chalk.cyan('🚀 Starting historical data generation...'));
        console.log(chalk.cyan(`   Period: June 04, 2025 to October 31, 2025`));
        console.log(chalk.cyan(`   Target: ${this.targetUsers} users & ${this.targetOctoberDailyEvents} daily events by October`));

        if (this.apiSecret === 'YOUR_API_SECRET_HERE') {
            console.log(chalk.yellow('⚠️  API secret not set - historical timing may not work properly'));
        }

        const endDate = new Date(this.simulationEndDate);
        let currentDate = new Date(this.simulationStartDate);
        let totalSent = 0;

        while (currentDate <= endDate) {
            const sent = await this.simulateDay(currentDate);
            totalSent += sent;
            currentDate.setDate(currentDate.getDate() + 1);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(chalk.cyan('\n🎉 Historical data generation completed!'));
        console.log(chalk.green(`   Total events sent: ${totalSent.toLocaleString()}`));
        console.log(chalk.green(`   Total users created: ${this.users.size.toLocaleString()}`));
        
        if (this.users.size >= this.targetUsers * 0.9) {
            console.log(chalk.green(`   ✅ Successfully reached ${this.users.size.toLocaleString()} users (target: ${this.targetUsers.toLocaleString()})`));
        } else {
            console.log(chalk.yellow(`   ⚠️  Only reached ${this.users.size.toLocaleString()} users (target: ${this.targetUsers.toLocaleString()})`));
        }
    }

    startContinuousOperation() {
        console.log(chalk.cyan('🔄 Starting continuous operation...'));
        console.log(chalk.cyan('   The script will run daily at 8 AM UTC'));

        this.generateHistoricalData().then(() => {
            cron.schedule('0 8 * * *', async () => {
                console.log(chalk.blue('\n--- Starting daily event generation ---'));
                await this.simulateDay(new Date());
                console.log(chalk.blue('--- Daily event generation completed ---\n'));
            });

            this.simulateDay(new Date());
        });

        console.log(chalk.green('✅ Continuous operation started! Press Ctrl+C to stop.'));
        
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n🛑 Stopping continuous operation...'));
            process.exit(0);
        });
    }


}

// Main execution
async function main() {
    const simulator = new EthiopianGrowthSimulator();
    const args = process.argv.slice(2);

    if (args.includes('--historical')) {
        await simulator.generateHistoricalData();
    } else if (args.includes('--continuous')) {
        simulator.startContinuousOperation();
    } else {
        console.log(chalk.yellow('Usage:'));
        console.log('  node simulator.js --historical    # Generate historical data only');
        console.log('  node simulator.js --continuous    # Run continuously (recommended)');
    }
}

main().catch(console.error);