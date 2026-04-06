use crate::models::weather::WeatherCondition;
use rand::seq::IndexedRandom;

struct PersonalitySet {
    headlines: &'static [&'static str],
    subtitles: &'static [&'static str],
}

fn get_personality(condition: &WeatherCondition, temp: f64, is_daytime: bool) -> &'static PersonalitySet {
    static CLEAR_HOT: PersonalitySet = PersonalitySet {
        headlines: &[
            "Fucking love this.\nin the sun.",
            "It's gorgeous.\noutside.",
            "Sun's out.\nno complaints.",
        ],
        subtitles: &[
            "Expect changes throughout the day",
            "Sunscreen. seriously.",
            "Peak outdoor hours. go.",
        ],
    };

    static CLEAR_MILD: PersonalitySet = PersonalitySet {
        headlines: &[
            "It's nice.\noutside.",
            "Pretty decent.\nout there.",
            "Can't complain.\nnot today.",
        ],
        subtitles: &[
            "Enjoy it while it lasts.",
            "A light jacket wouldn't hurt.",
            "Good day to exist outdoors.",
        ],
    };

    static CLEAR_COLD: PersonalitySet = PersonalitySet {
        headlines: &[
            "Clear but\nfreezing.",
            "Sunny and\ncold as hell.",
            "Beautiful.\nbut brutal.",
        ],
        subtitles: &[
            "The sun is lying to you.",
            "Looks warm. it's not.",
            "Layer up despite the sunshine.",
        ],
    };

    static CLEAR_NIGHT: PersonalitySet = PersonalitySet {
        headlines: &[
            "Clear skies.\ntonight.",
            "Stars are out.\nif you care.",
            "Nice night.\nout there.",
        ],
        subtitles: &[
            "Good sleeping weather.",
            "Temperature's dropping.",
            "Grab a jacket if you're heading out.",
        ],
    };

    static CLOUDY: PersonalitySet = PersonalitySet {
        headlines: &[
            "Meh.\nit's cloudy.",
            "Overcast.\nagain.",
            "Grey skies.\nall day.",
        ],
        subtitles: &[
            "Not great, not terrible.",
            "The sun exists. somewhere.",
            "At least it's not raining. yet.",
        ],
    };

    static RAIN: PersonalitySet = PersonalitySet {
        headlines: &[
            "It's fucking\nraining.\nnow.",
            "Rain.\njust rain.",
            "Wet out there.\nobviously.",
        ],
        subtitles: &[
            "You can look outside to get more information.",
            "Umbrella or regret. your choice.",
            "Indoor plans seem wise.",
        ],
    };

    static DRIZZLE: PersonalitySet = PersonalitySet {
        headlines: &[
            "It's drizzling.\na bit.",
            "Light rain.\nbarely there.",
            "Sprinkling.\nout there.",
        ],
        subtitles: &[
            "Umbrella optional. your call.",
            "Not enough to cancel plans.",
            "Just enough to be annoying.",
        ],
    };

    static THUNDERSTORM: PersonalitySet = PersonalitySet {
        headlines: &[
            "Oh hell.\nit's storming.",
            "Thunder.\nand lightning.",
            "Stay inside.\nseriously.",
        ],
        subtitles: &[
            "Maybe don't go outside.",
            "Nature is angry today.",
            "Good day for movies and blankets.",
        ],
    };

    static SNOW: PersonalitySet = PersonalitySet {
        headlines: &[
            "It's freezing.\nabsolutely\nfreezing.",
            "Snow.\neverywhere.",
            "White out.\nthere.",
        ],
        subtitles: &[
            "Layer up or stay inside. your call.",
            "Roads are questionable.",
            "Hot chocolate weather.",
        ],
    };

    static FOG: PersonalitySet = PersonalitySet {
        headlines: &[
            "Can't see shit.\nit's foggy.",
            "Fog.\neverywhere.",
            "Visibility?\nnone.",
        ],
        subtitles: &[
            "Drive slow or don't drive at all.",
            "Silent Hill vibes.",
            "The world has loading issues.",
        ],
    };

    static DUST: PersonalitySet = PersonalitySet {
        headlines: &[
            "Dusty.\nout there.",
            "Air quality?\nterrible.",
            "Dust storm.\ngreat.",
        ],
        subtitles: &[
            "Maybe keep the windows shut.",
            "Breathing is overrated anyway.",
            "Stay inside if you can.",
        ],
    };

    static TORNADO: PersonalitySet = PersonalitySet {
        headlines: &[
            "Tornado.\nget safe.\nnow.",
            "Take cover.\nimmediately.",
            "This is\nnot a drill.",
        ],
        subtitles: &[
            "Seek shelter immediately.",
            "Basement. now.",
            "Safety first. everything else later.",
        ],
    };

    match condition {
        WeatherCondition::Clear if !is_daytime => &CLEAR_NIGHT,
        WeatherCondition::Clear if temp >= 28.0 => &CLEAR_HOT,
        WeatherCondition::Clear if temp <= 5.0 => &CLEAR_COLD,
        WeatherCondition::Clear => &CLEAR_MILD,
        WeatherCondition::Clouds => &CLOUDY,
        WeatherCondition::Rain => &RAIN,
        WeatherCondition::Drizzle => &DRIZZLE,
        WeatherCondition::Thunderstorm => &THUNDERSTORM,
        WeatherCondition::Snow => &SNOW,
        WeatherCondition::Mist | WeatherCondition::Fog | WeatherCondition::Haze => &FOG,
        WeatherCondition::Dust => &DUST,
        WeatherCondition::Tornado => &TORNADO,
    }
}

pub fn generate_personality(
    condition: &WeatherCondition,
    temp: f64,
    is_daytime: bool,
) -> (String, String) {
    let mut rng = rand::rng();
    let set = get_personality(condition, temp, is_daytime);

    let headline = set
        .headlines
        .choose(&mut rng)
        .unwrap_or(&set.headlines[0]);
    let subtitle = set
        .subtitles
        .choose(&mut rng)
        .unwrap_or(&set.subtitles[0]);

    (headline.to_string(), subtitle.to_string())
}
