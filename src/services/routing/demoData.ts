import { CityLocation, RouteCandidate } from '../../types';

export const CITIES: CityLocation[] = [
  {
    id: 'pune',
    name: { en: 'Pune', hi: 'पुणे' },
    coordinates: [73.8567, 18.5204],
    state: 'Maharashtra',
  },
  {
    id: 'mumbai',
    name: { en: 'Mumbai', hi: 'मुंबई' },
    coordinates: [72.8777, 19.0760],
    state: 'Maharashtra',
  },
  {
    id: 'nashik',
    name: { en: 'Nashik', hi: 'नासिक' },
    coordinates: [73.7898, 19.9975],
    state: 'Maharashtra',
  },
  {
    id: 'delhi',
    name: { en: 'Delhi', hi: 'दिल्ली' },
    coordinates: [77.1025, 28.7041],
    state: 'Delhi NCR',
  },
  {
    id: 'jaipur',
    name: { en: 'Jaipur', hi: 'जयपुर' },
    coordinates: [75.7873, 26.9124],
    state: 'Rajasthan',
  },
];

export const CITY_ALIASES: Record<string, string> = {
  pune: 'pune',
  'पुणे': 'pune',
  poona: 'pune',
  mumbai: 'mumbai',
  'मुंबई': 'mumbai',
  bombay: 'mumbai',
  nashik: 'nashik',
  'नासिक': 'nashik',
  nasik: 'nashik',
  delhi: 'delhi',
  'दिल्ली': 'delhi',
  'new delhi': 'delhi',
  jaipur: 'jaipur',
  'जयपुर': 'jaipur',
};

export const CORRIDOR_ROUTES: Record<string, RouteCandidate[]> = {
  // Mumbai <-> Pune Corridor
  'mumbai|pune': [
    {
      id: 'mumbai_pune_exp',
      name: {
        en: 'Mumbai–Pune Expressway (Recommended for High Containers)',
        hi: 'मुंबई–पुणे एक्सप्रेसवे (कंटेनर व ऊँची गाड़ियों हेतु सुरक्षित)',
      },
      distanceKm: 148,
      durationMinutes: 195,
      tollEstimateInr: 580,
      whyExplanation: {
        en: 'Bypasses the documented 4.0m low-clearance railway bridge in Khandala. Dedicated heavy truck climbing lanes on Bhor Ghat.',
        hi: 'खंडाला के 4.0 मीटर नीचे रेलवे पुल से बचाता है। भोर घाट पर ट्रकों के लिए अलग चढ़ाई लेन उपलब्ध है।',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.8777, 19.0760], // Mumbai
          [72.9856, 19.0330], // Navi Mumbai / Vashi
          [73.1154, 18.9894], // Panvel Expressway Gate
          [73.2389, 18.8654], // Khalapur Toll Plaza
          [73.3421, 18.7845], // Khandala Ghat Viaduct
          [73.4072, 18.7557], // Lonavala Bypass
          [73.5512, 18.7180], // Talegaon Toll
          [73.7124, 18.6278], // Dehu Road / Nigdi
          [73.8567, 18.5204], // Pune Swargate / Station
        ],
      },
      restrictions: [
        {
          id: 'exp_axle_rating',
          kind: 'axle',
          name: {
            en: 'Amrutanjan Viaduct Axle Rating Check',
            hi: 'अमृतांजन पुल एक्सल भार जाँच',
          },
          coordinates: [73.3421, 18.7845],
          limitType: 'axle',
          roadName: {
            en: 'Yashwantrao Chavan Expressway (Km 44.2)',
            hi: 'यशवंतराव चव्हाण एक्सप्रेसवे (किमी 44.2)',
          },
          actionGuidance: {
            en: 'Stay in left heavy vehicle lane. Heavy multi-axle configurations (6+ axles) must maintain 50m vehicle spacing.',
            hi: 'बाईं ओर भारी वाहन लेन में रहें। 6 से अधिक एक्सल वाली गाड़ियाँ 50 मीटर की दूरी बनाए रखें।',
          },
          sourceAuthority: 'MSRDC Maharashtra State Road Development Corp',
          verificationStatus: 'unverified_demo',
        },
      ],
      turnSteps: {
        en: [
          'Depart Mumbai via Eastern Freeway / Sion-Panvel Highway',
          'Pass Kalamboli junction and enter Mumbai-Pune Expressway',
          'Approach Bhor Ghat section (strictly adhere to 40 km/h truck speed limit)',
          'Pass Lonavala without low clearance hazard',
          'Exit through Talegaon toll plaza towards Pune bypass',
        ],
        hi: [
          'सायन-पनवेल हाईवे से मुंबई से प्रस्थान करें',
          'कलंबोली जंक्शन पार कर मुंबई-पुणे एक्सप्रेसवे पर प्रवेश करें',
          'भोर घाट सेक्शन पर गति 40 किमी/घंटा से कम रखें',
          'लोनावला बिना किसी ऊँचाई अड़चन के पार करें',
          'तलेगांव टोल से होते हुए पुणे बाईपास पर पहुँचें',
        ],
      },
    },
    {
      id: 'mumbai_pune_old_nh48',
      name: {
        en: 'Old Mumbai–Pune Highway (NH48 via Khandala Ghat)',
        hi: 'पुराना मुंबई–पुणे हाईवे (NH48 खंडाला घाट)',
      },
      distanceKm: 154,
      durationMinutes: 240,
      tollEstimateInr: 220,
      whyExplanation: {
        en: 'Free of expressway toll, BUT contains a historic low railway overbridge with 4.0m vertical clearance near Lonavala.',
        hi: 'टोल कम है, परंतु लोनावला के पास 4.0 मीटर का नीचा रेलवे ओवरब्रिज है। 4 मीटर से ऊँची गाड़ियाँ फँस सकती हैं।',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.8777, 19.0760], // Mumbai
          [73.0125, 19.0201], // CBD Belapur
          [73.1205, 18.9754], // Old Panvel Town
          [73.2654, 18.8412], // Khopoli Town
          [73.3245, 18.7612], // Khandala Old Ghat (Sharp Hairpins)
          [73.4010, 18.7510], // Lonavala Railway Overbridge (LOW CLEARANCE)
          [73.4812, 18.7302], // Kamshet
          [73.7456, 18.6120], // Pimpri-Chinchwad
          [73.8567, 18.5204], // Pune
        ],
      },
      restrictions: [
        {
          id: 'lonavala_low_bridge',
          kind: 'bridge',
          name: {
            en: 'Lonavala Railway Overbridge Clearance (4.0m)',
            hi: 'लोनावला रेलवे ओवरब्रिज ऊँचाई सीमा (4.0 मी)',
          },
          coordinates: [73.4010, 18.7510],
          limitType: 'height',
          limitValue: 4.0, // 4.0 meters
          roadName: {
            en: 'Old NH48 Khandala–Lonavala Link Road (Simulated Hazard)',
            hi: 'पुराना NH48 खंडाला–लोनावला लिंक रोड',
          },
          actionGuidance: {
            en: 'CRITICAL: Container carriers and high cargo (> 4.0m) CANNOT PASS. Divert to Expressway via Khopoli connector.',
            hi: 'चेतावनी: कंटेनर व 4.0 मीटर से ऊँची गाड़ियाँ पार नहीं कर सकतीं। खोपोली से एक्सप्रेसवे पर मुड़ें।',
          },
          sourceAuthority: 'Central Railway & PWD Maharashtra',
          verificationStatus: 'verified',
        },
      ],
      turnSteps: {
        en: [
          'Leave Mumbai via Sion-Panvel Highway into Old Panvel',
          'Follow Old NH48 passing through Khopoli',
          'Climb the historic Khandala Ghat with sharp hairpins',
          'DANGER: Low clearance arch bridge ahead near Lonavala (4.0m limit)',
          'Continue through Kamshet and Chinchwad into Pune',
        ],
        hi: [
          'सायन-पनवेल से पुराने पनवेल शहर में प्रवेश करें',
          'खोपोली से होते हुए पुराने NH48 पर बढ़ें',
          'तीखे मोड़ों वाले खंडाला घाट पर सावधानी से चढ़ें',
          'ख़तरा: लोनावला के पास 4.0 मीटर का नीचा रेलवे पुल आएगा',
          'कामशेत और पिंपरी-चिंचवड़ होते हुए पुणे पहुँचें',
        ],
      },
    },
  ],

  // Mumbai <-> Nashik Corridor
  'mumbai|nashik': [
    {
      id: 'mumbai_nashik_nh160',
      name: {
        en: 'NH160 via Kasara Ghat (Standard Corridor)',
        hi: 'NH160 कसारा घाट होकर (मुख्य मालवाहक रास्ता)',
      },
      distanceKm: 167,
      durationMinutes: 245,
      tollEstimateInr: 390,
      whyExplanation: {
        en: 'Direct 4-lane highway, but subject to peak-hour Kasara Ghat heavy truck restrictions between 07:00 and 11:00 AM.',
        hi: 'सीधा 4-लेन हाईवे, परंतु सुबह 07:00 से 11:00 बजे तक कसारा घाट में भारी गाड़ियों पर रोक रहती है।',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.8777, 19.0760], // Mumbai
          [72.9781, 19.2183], // Thane Majiwada
          [73.1250, 19.3450], // Bhiwandi Freight Bypass
          [73.3120, 19.5120], // Asangaon
          [73.4980, 19.6620], // Kasara Ghat Checkpost (TIME BAN)
          [73.5510, 19.7020], // Igatpuri
          [73.6820, 19.8650], // Ghoti Toll
          [73.7898, 19.9975], // Nashik
        ],
      },
      restrictions: [
        {
          id: 'kasara_time_ban',
          kind: 'time_ban',
          name: {
            en: 'Kasara Ghat Heavy Truck Entry Ban (07:00–11:00)',
            hi: 'कसारा घाट भारी ट्रक नो-एंट्री (07:00–11:00)',
          },
          coordinates: [73.4980, 19.6620],
          limitType: 'time',
          timeWindow: {
            start: '07:00',
            end: '11:00',
          },
          roadName: {
            en: 'NH160 Mumbai–Agra Highway (Km 118)',
            hi: 'NH160 मुंबई–आगरा हाईवे (किमी 118)',
          },
          actionGuidance: {
            en: 'Heavy multi-axle trucks are held at Asangaon parking lot between 07:00–11:00. Time departure to arrive outside this window.',
            hi: 'सुबह 07:00–11:00 के बीच ट्रकों को आसनगांव में रोका जाता है। इस समय से पहले या बाद में निकलने की योजना बनाएँ।',
          },
          sourceAuthority: 'Highway Safety Police Maharashtra',
          verificationStatus: 'verified',
        },
      ],
      turnSteps: {
        en: [
          'Exit Mumbai via Eastern Express Highway to Thane Majiwada',
          'Pass Bhiwandi logistics hub onto NH160',
          'Check arrival clock at Asangaon before entering Kasara Ghat',
          'Climb Kasara Ghat using designated heavy vehicle crawling lane',
          'Cross Igatpuri plateau and proceed to Nashik',
        ],
        hi: [
          'ईस्टर्न एक्सप्रेसवे से ठाणे माजिवड़ा की ओर निकलें',
          'भिवंडी लॉजिस्टिक्स क्षेत्र से NH160 पर आएँ',
          'कसारा घाट में प्रवेश से पहले समय की जाँच करें',
          'घाटी में भारी गाड़ियों की अलग लेन में धीरे चढ़ें',
          'इगतपुरी से होते हुए नासिक शहर पहुँचें',
        ],
      },
    },
  ],

  // Pune <-> Nashik Corridor
  'nashik|pune': [
    {
      id: 'pune_nashik_nh60',
      name: {
        en: 'NH60 via Chakan & Sangamner (Freight Route)',
        hi: 'NH60 चाकण व संगमनेर होकर (औद्योगिक रास्ता)',
      },
      distanceKm: 212,
      durationMinutes: 290,
      tollEstimateInr: 440,
      whyExplanation: {
        en: 'Primary link connecting Pune auto cluster with Nashik. Heavy industrial traffic through Chakan and single-lane bypass at Narayangaon.',
        hi: 'पुणे ऑटोमोबाइल उद्योग को नासिक से जोड़ने वाला मुख्य मार्ग। चाकण और नारायणगांव में भारी आवागमन रहता है।',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [73.8567, 18.5204], // Pune
          [73.8610, 18.7540], // Chakan Industrial Zone
          [73.9120, 19.1120], // Narayangaon
          [74.0210, 19.3450], // Alephata Junction
          [74.1520, 19.5720], // Sangamner
          [73.9850, 19.8510], // Sinnar Toll
          [73.7898, 19.9975], // Nashik
        ],
      },
      restrictions: [
        {
          id: 'sangamner_weight_limit',
          kind: 'weight',
          name: {
            en: 'Sangamner River Bridge GVW Limit (40t)',
            hi: 'संगमनेर नदी पुल कुल वज़न सीमा (40 टन)',
          },
          coordinates: [74.1520, 19.5720],
          limitType: 'weight',
          limitValue: 40.0,
          roadName: {
            en: 'Pravara River Old Causeway / Bypass (NH60)',
            hi: 'प्रवरा नदी पुराना पुल (NH60)',
          },
          actionGuidance: {
            en: 'Trucks with loaded gross weight exceeding 40 tonnes must use the eastern bypass ring road.',
            hi: '40 टन से अधिक लदे वज़न वाले ट्रक पूर्वी रिंग रोड बाईपास का उपयोग करें।',
          },
          sourceAuthority: 'NHAI Nashik Project Unit',
          verificationStatus: 'unverified_demo',
        },
      ],
      turnSteps: {
        en: [
          'Leave Pune via Moshi / Bhosari towards Chakan',
          'Pass Chakan industrial junction (expect heavy truck movement)',
          'Follow NH60 through Narayangaon and Alephata',
          'Check bridge weight limits at Sangamner bypass',
          'Descend through Sinnar into Nashik MIDC area',
        ],
        hi: [
          'भोसरी-मोशी होते हुए चाकण की ओर प्रस्थान करें',
          'चाकण औद्योगिक क्षेत्र से सावधान होकर निकलें',
          'NH60 पर नारायणगांव और आळेफाटा पार करें',
          'संगमनेर बाईपास पर 40 टन भार सीमा का ध्यान रखें',
          'सिन्नर होते हुए नासिक औद्योगिक क्षेत्र पहुँचें',
        ],
      },
    },
  ],

  // Delhi <-> Jaipur Corridor
  'delhi|jaipur': [
    {
      id: 'delhi_jaipur_ne4',
      name: {
        en: 'Delhi–Mumbai Expressway (NE4 via Sohna & Dausa)',
        hi: 'दिल्ली–मुंबई एक्सप्रेसवे (NE4 सोहना व दौसा होकर)',
      },
      distanceKm: 275,
      durationMinutes: 240,
      tollEstimateInr: 720,
      whyExplanation: {
        en: 'Engineered for over-dimensional heavy vehicles and multi-axle trailers. High-clearance flyovers (> 5.5m) and smooth gradients.',
        hi: 'भारी और ओडीसी ट्रकों के लिए विशेष रूप से निर्मित। 5.5 मीटर से ऊँचे ओवरब्रिज और चौड़ी लेन उपलब्ध हैं।',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.1025, 28.7041], // Delhi
          [77.0620, 28.4520], // Gurgaon Rajiv Chowk
          [77.0510, 28.2450], // Sohna Elevated Entry
          [76.8120, 27.8450], // Nuh / Ferozepur Jhirka
          [76.6210, 27.1540], // Dausa Interchange
          [75.7873, 26.9124], // Jaipur
        ],
      },
      restrictions: [],
      turnSteps: {
        en: [
          'Exit Delhi south via Gurgaon Rajiv Chowk to Sohna',
          'Enter Delhi-Mumbai Expressway NE4 via toll plaza',
          'Maintain cruise speed in designated heavy truck lanes',
          'Take Dausa exit towards Jaipur bypass',
          'Arrive at Jaipur Transport Nagar',
        ],
        hi: [
          'दिल्ली से सोहना होते हुए एक्सप्रेसवे की ओर बढ़ें',
          'NE4 दिल्ली-मुंबई एक्सप्रेसवे पर प्रवेश करें',
          'भारी वाहन लेन में सुरक्षित गति बनाए रखें',
          'दौसा इंटरचेंज से जयपुर बाईपास की ओर मुड़ें',
          'जयपुर ट्रांसपोर्ट नगर में प्रवेश करें',
        ],
      },
    },
    {
      id: 'delhi_jaipur_nh48_old',
      name: {
        en: 'Old NH48 Highway via Dharuhera & Kotputli',
        hi: 'पुराना NH48 हाईवे (धारूहेड़ा व कोटपूतली होकर)',
      },
      distanceKm: 268,
      durationMinutes: 340,
      tollEstimateInr: 410,
      whyExplanation: {
        en: 'Traditional freight route. Slower due to flyover construction and low arch clearances near industrial underpasses.',
        hi: 'पारंपरिक मार्ग, परंतु फ्लाईओवर निर्माण और कुछ अंडरपासों पर 4.1 मीटर ऊँचाई सीमा के कारण धीमा है।',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.1025, 28.7041], // Delhi
          [76.9850, 28.3840], // Manesar Industrial Underpass (4.1m clearance)
          [76.7920, 28.2040], // Dharuhera
          [76.3510, 27.7010], // Behror
          [76.2100, 27.6040], // Kotputli
          [75.9520, 27.3100], // Shahpura
          [75.7873, 26.9124], // Jaipur
        ],
      },
      restrictions: [
        {
          id: 'manesar_underpass',
          kind: 'bridge',
          name: {
            en: 'Manesar Underpass Height Restriction (4.1m)',
            hi: 'मानेसर अंडरपास ऊँचाई सीमा (4.1 मीटर)',
          },
          coordinates: [76.9850, 28.3840],
          limitType: 'height',
          limitValue: 4.1,
          roadName: {
            en: 'NH48 Manesar Service Corridor',
            hi: 'NH48 मानेसर सर्विस रोड',
          },
          actionGuidance: {
            en: 'Vehicles taller than 4.1m must use elevated main carriageway; do not enter service lane underpass.',
            hi: '4.1 मीटर से ऊँची गाड़ियाँ मुख्य फ्लाईओवर पर रहें, सर्विस अंडरपास में न जाएँ।',
          },
          sourceAuthority: 'NHAI Delhi-Jaipur Corridor Division',
          verificationStatus: 'unverified_demo',
        },
      ],
      turnSteps: {
        en: [
          'Depart Delhi towards Gurgaon and Manesar',
          'Notice Manesar underpass clearance warning (4.1m)',
          'Pass Dharuhera industrial cluster',
          'Cross Behror and Kotputli via NH48',
          'Enter Jaipur via Shahpura',
        ],
        hi: [
          'दिल्ली से मानेसर की ओर बढ़ें',
          'मानेसर अंडरपास की 4.1 मीटर ऊँचाई सीमा पर ध्यान दें',
          'धारूहेड़ा और बहरोड़ पार करें',
          'कोटपूतली होते हुए शाहपुरा पहुँचें',
          'जयपुर शहर में प्रवेश करें',
        ],
      },
    },
  ],
};
