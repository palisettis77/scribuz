import requests

SUPABASE_URL = 'https://qvvrgtevqqdrprcyndvo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dnJndGV2cXFkcnByY3luZHZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY2ODQ1NiwiZXhwIjoyMDkzMjQ0NDU2fQ.xGdG7HTSoitucK1FCo2R-Z-bTfWrZrMkRhoGPfUtT-g'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

creators = [
    # ── FOOD ──
    {
        'name': 'Biryani Boss Salim',
        'email': 'salim@test.com',
        'category': 'Food',
        'city': 'Hyderabad',
        'bio': 'Third-generation Hyderabadi dum biryani master. Hosts intimate biryani workshops and private Nizami dining experiences for up to 15 guests.',
        'followers': '340K',
        'price_from': 22000,
        'rating': 4.9,
        'total_events': 34,
        'instagram': '@biryanilosalim',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'Bake With Divya',
        'email': 'divya@test.com',
        'category': 'Food',
        'city': 'Hyderabad',
        'bio': 'Pastry chef and dessert creator. Hosts private baking workshops, custom cake design classes, and sweet table experiences for parties.',
        'followers': '88K',
        'price_from': 12000,
        'rating': 4.8,
        'total_events': 22,
        'instagram': '@bakewithdivya',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'Vegan Vibes Pooja',
        'email': 'pooja.vegan@test.com',
        'category': 'Food',
        'city': 'Hyderabad',
        'bio': 'Plant-based chef and nutritionist. Hosts private vegan dinner experiences and healthy cooking workshops for groups of 4–12.',
        'followers': '155K',
        'price_from': 14000,
        'rating': 4.7,
        'total_events': 18,
        'instagram': '@veganvibespooja',
        'is_verified': True,
        'is_active': True,
    },

    # ── MUSIC ──
    {
        'name': 'SitarByShubham',
        'email': 'shubham@test.com',
        'category': 'Music',
        'city': 'Hyderabad',
        'bio': 'Classical sitar player trained under Pandit Ravi Shankar\'s lineage. Offers intimate raga performances and sitar masterclasses.',
        'followers': '72K',
        'price_from': 20000,
        'rating': 5.0,
        'total_events': 12,
        'instagram': '@sitarbyshubham',
        'youtube': 'youtube.com/sitarshubham',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'DJ Preethi',
        'email': 'preethi.dj@test.com',
        'category': 'Music',
        'city': 'Hyderabad',
        'bio': 'Professional DJ and music producer. Performs live at private parties, weddings, and corporate events. Specialises in Bollywood and EDM fusion.',
        'followers': '195K',
        'price_from': 30000,
        'rating': 4.8,
        'total_events': 55,
        'instagram': '@djpreethi',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'VoiceOfNaresh',
        'email': 'naresh@test.com',
        'category': 'Music',
        'city': 'Hyderabad',
        'bio': 'Playback singer and vocal coach with 500K+ YouTube subscribers. Private singing sessions, vocal workshops, and live acoustic performances.',
        'followers': '520K',
        'price_from': 35000,
        'rating': 4.9,
        'total_events': 28,
        'youtube': 'youtube.com/voiceofnaresh',
        'instagram': '@voiceofnaresh',
        'is_verified': True,
        'is_active': True,
    },

    # ── FITNESS ──
    {
        'name': 'YogaWithPrema',
        'email': 'prema@test.com',
        'category': 'Fitness',
        'city': 'Hyderabad',
        'bio': 'Certified yoga instructor with 10 years experience. Private yoga sessions, meditation workshops, and corporate wellness programs.',
        'followers': '240K',
        'price_from': 9000,
        'rating': 4.9,
        'total_events': 95,
        'instagram': '@yogawithprema',
        'youtube': 'youtube.com/yogaprema',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'BoxFit Aryan',
        'email': 'aryan.box@test.com',
        'category': 'Fitness',
        'city': 'Hyderabad',
        'bio': 'Boxing trainer and fitness influencer. Private boxing sessions, group bootcamps, and corporate team-building fitness events.',
        'followers': '165K',
        'price_from': 11000,
        'rating': 4.7,
        'total_events': 42,
        'instagram': '@boxfitaryan',
        'is_verified': True,
        'is_active': True,
    },

    # ── COMEDY ──
    {
        'name': 'RoastKing Vikram',
        'email': 'vikram@test.com',
        'category': 'Comedy',
        'city': 'Hyderabad',
        'bio': 'Stand-up comedian known for roast comedy and crowd work. Perfect for birthday roasts, corporate parties, and college fests.',
        'followers': '410K',
        'price_from': 25000,
        'rating': 4.8,
        'total_events': 76,
        'instagram': '@roastkingvikram',
        'youtube': 'youtube.com/roastkingvikram',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'Improv Queen Nadia',
        'email': 'nadia@test.com',
        'category': 'Comedy',
        'city': 'Hyderabad',
        'bio': 'Improv comedian and sketch writer. Hosts interactive improv shows and comedy workshops for groups. Great for team events.',
        'followers': '88K',
        'price_from': 18000,
        'rating': 4.6,
        'total_events': 31,
        'instagram': '@improvqueennadia',
        'is_verified': True,
        'is_active': True,
    },

    # ── TECH ──
    {
        'name': 'StartupSutra Rahul',
        'email': 'rahul.startup@test.com',
        'category': 'Tech',
        'city': 'Hyderabad',
        'bio': 'Serial entrepreneur and startup mentor with 3 exits. Private mentorship sessions, startup workshops, and investor pitch coaching.',
        'followers': '380K',
        'price_from': 40000,
        'rating': 4.9,
        'total_events': 19,
        'youtube': 'youtube.com/startupsutra',
        'instagram': '@startupsutra',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'CodeWithAnanya',
        'email': 'ananya.code@test.com',
        'category': 'Tech',
        'city': 'Hyderabad',
        'bio': 'Full-stack developer and coding educator. Private coding bootcamps, web development workshops, and career guidance for aspiring developers.',
        'followers': '175K',
        'price_from': 16000,
        'rating': 4.7,
        'total_events': 24,
        'youtube': 'youtube.com/codewithananya',
        'instagram': '@codewithananya',
        'is_verified': True,
        'is_active': True,
    },

    # ── GAMING ──
    {
        'name': 'QueenOfValor',
        'email': 'valor@test.com',
        'category': 'Gaming',
        'city': 'Hyderabad',
        'bio': 'Professional Valorant player and esports coach. Private coaching sessions, LAN party hosting, and gaming tournament organisation.',
        'followers': '620K',
        'price_from': 15000,
        'rating': 4.9,
        'total_events': 43,
        'youtube': 'youtube.com/queenofvalor',
        'instagram': '@queenofvalor',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'RetroGamer Raj',
        'email': 'raj.retro@test.com',
        'category': 'Gaming',
        'city': 'Hyderabad',
        'bio': 'Retro gaming collector and streamer with 300+ classic consoles. Private retro gaming nights and gaming history workshops.',
        'followers': '95K',
        'price_from': 10000,
        'rating': 4.6,
        'total_events': 15,
        'instagram': '@retrogamerraj',
        'youtube': 'youtube.com/retrogamerraj',
        'is_verified': True,
        'is_active': True,
    },

    # ── ART ──
    {
        'name': 'PortraitsByPriya',
        'email': 'priya.art@test.com',
        'category': 'Art',
        'city': 'Hyderabad',
        'bio': 'Commissioned portrait artist and live event painter. Creates live portraits at weddings and events, and hosts private art workshops.',
        'followers': '110K',
        'price_from': 16000,
        'rating': 4.9,
        'total_events': 38,
        'instagram': '@portraitsbypriya',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'StreetArt Sameer',
        'email': 'sameer@test.com',
        'category': 'Art',
        'city': 'Hyderabad',
        'bio': 'Graffiti and street art creator. Live mural painting at events, private street art workshops, and custom wall art for spaces.',
        'followers': '85K',
        'price_from': 20000,
        'rating': 4.7,
        'total_events': 26,
        'instagram': '@streetartsameer',
        'is_verified': True,
        'is_active': True,
    },

    # ── TRAVEL ──
    {
        'name': 'HydExplorer Dev',
        'email': 'dev.travel@test.com',
        'category': 'Travel',
        'city': 'Hyderabad',
        'bio': 'Hidden Hyderabad expert. Hosts exclusive private tours of Old City, heritage walks, and off-the-beaten-path food trails.',
        'followers': '145K',
        'price_from': 8000,
        'rating': 4.9,
        'total_events': 62,
        'instagram': '@hydexplorerdev',
        'youtube': 'youtube.com/hydexplorer',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'Backpack Bhumi',
        'email': 'bhumi@test.com',
        'category': 'Travel',
        'city': 'Hyderabad',
        'bio': 'Solo travel creator and trip planner. Hosts travel planning workshops, destination photography walks, and group day trips around Telangana.',
        'followers': '290K',
        'price_from': 11000,
        'rating': 4.8,
        'total_events': 29,
        'instagram': '@backpackbhumi',
        'youtube': 'youtube.com/backpackbhumi',
        'is_verified': True,
        'is_active': True,
    },

    # ── EDUCATION ──
    {
        'name': 'FinanceWithFarhan',
        'email': 'farhan@test.com',
        'category': 'Education',
        'city': 'Hyderabad',
        'bio': 'Personal finance educator and SEBI-registered advisor. Private financial planning sessions, stock market workshops, and investment masterclasses.',
        'followers': '480K',
        'price_from': 20000,
        'rating': 4.8,
        'total_events': 35,
        'youtube': 'youtube.com/financewithfarhan',
        'instagram': '@financewithfarhan',
        'is_verified': True,
        'is_active': True,
    },
    {
        'name': 'SpeakUp Shreya',
        'email': 'shreya@test.com',
        'category': 'Education',
        'city': 'Hyderabad',
        'bio': 'Public speaking coach and TEDx speaker. Private communication workshops, interview prep sessions, and confidence-building masterclasses.',
        'followers': '195K',
        'price_from': 15000,
        'rating': 4.9,
        'total_events': 47,
        'instagram': '@speakupshreya',
        'youtube': 'youtube.com/speakupshreya',
        'is_verified': True,
        'is_active': True,
    },
]

url = f"{SUPABASE_URL}/rest/v1/creators"

print("Seeding 20 new creators...\n")
success = 0
skipped = 0
failed = 0

for c in creators:
    res = requests.post(url, headers=HEADERS, json=c)
    if res.status_code in [200, 201]:
        print(f"  ✅ Added: {c['name']} ({c['category']})")
        success += 1
    elif res.status_code == 409:
        print(f"  ⚠️  Skipped: {c['name']} (already exists)")
        skipped += 1
    else:
        print(f"  ❌ Failed: {c['name']} — {res.status_code}: {res.text[:80]}")
        failed += 1

print(f"\n{'─'*40}")
print(f"✅ Added:   {success}")
print(f"⚠️  Skipped: {skipped}")
print(f"❌ Failed:  {failed}")
print(f"\nDone! Refresh http://127.0.0.1:5000/browse.html 🚀")