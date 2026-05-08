import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  Trophy,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Star,
  Sparkles,
  ShieldCheck,
  Eye,
  Crown,
  Flame,
  Heart,
  Zap,
} from "lucide-react";
import CrestImage from "@/components/CrestImage";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Banned words ─────────────────────────────────────────────────────────────
const BANNED_WORDS = [
  "10odds", "10-odds", "10odds.com", "10odds.net", "10odds.org",
  "admin", "administrator", "allah", "al-qaeda", "alqaeda", "anus", "anuses", "ape", "apes",
  "arse", "arsehole", "ass", "assassin", "assassins", "asses", "asshole",
  "atheism", "atheist", "bastard", "bastards", "bin laden", "bitch", "bitches", "bitching",
  "blowjob", "blowjobs", "boko haram", "boob", "boobies", "boobs", "buddha",
  "bullshit", "che guevara", "chimp", "chimpanzee", "chink", "chinks",
  "christ", "christian", "christians", "clitoris", "cocaine", "cock", "cockhead", "cocks",
  "cracka", "cracker", "crackers", "crap", "craps", "creep", "creeps",
  "cunt", "cunts", "dick", "dickhead", "dicks", "dildo", "dildos",
  "douche", "douchebag", "douchebags", "dumbass", "ejaculate", "ejaculation",
  "fag", "faggot", "faggots", "fags", "fck", "freak", "freaks",
  "fuck", "fucked", "fucker", "fucking", "fucks", "fuk",
  "god", "gook", "gooks", "gorilla", "gorillas", "gtfo",
  "handjob", "handjobs", "heroin", "hindu", "hinduism", "hitler",
  "honkey", "honkies", "honky", "hooker", "hookers", "idiot", "idiots",
  "imbecile", "imbeciles", "islam", "islamic", "islamist", "islamists",
  "isis", "jerk", "jerks", "jesus", "jesus christ", "jew", "jewish",
  "jihad", "kike", "kikes", "loser", "losers",
  "masturbate", "masturbation", "meth", "methamphetamine",
  "moderator", "monkey", "monkeys", "moron", "morons",
  "motherf", "motherfucker", "murder", "murderer",
  "nazi", "nazis", "nigger", "niggers", "nigga", "niggas",
  "nipple", "nipples", "official", "orgasm", "orgasms",
  "penis", "penises", "perv", "pervert", "perverts",
  "pimp", "pimps", "piss", "pissed", "pisser", "pisses", "pissing",
  "pol pot", "porn", "porno", "pornography", "prick", "pricks",
  "prostitute", "prostitutes", "pussy", "pussies",
  "rape", "rapes", "rapist", "rapists", "retard", "retarded", "retards",
  "scrotum", "shit", "shits", "shitter", "shitting", "shithead", "spastic",
  "spic", "spics", "spaz", "staff", "stalin", "stfu", "slut", "sluts",
  "support", "taliban", "terrorism", "terrorist", "terrorists",
  "testicle", "testicles", "tits", "titty", "titties", "tit",
  "tranny", "trannies", "twat", "twats", "vagina", "vaginas",
  "wank", "wanker", "wankers", "wanking", "wetback", "wetbacks", "whore", "whores",
  "a$$", "a$$hole", "a$$h0le", "a$$holes", "a$$hat", "a$$hats",
  "a55", "a55hole", "arseh0le", "b1tch", "b1tch3s", "b1tches",
  "b17ch", "b17ches", "b!tch", "b!tches", "b00b", "b00bs",
  "b00bies", "b00biez", "c0ck", "c0cks", "c0ckhead", "c0cksucker",
  "cuntz", "cunts", "d1ck", "d1ckhead", "d1cks", "d0uche", "d0uchebag",
  "f4g", "f4ggot", "f4gs", "f4ggots", "f@ck", "f@cker", "f@cking",
  "f*ck", "f*cker", "f*cking", "f*cks", "f#ck", "f#cker", "f#cking",
  "f_u_c_k", "f u c k", "f-u-c-k", "f.u.c.k", "f u k", "f-u-k",
  "fuk", "fuker", "fuking", "fuq", "fuqer", "fuqing",
  "h0m0", "h0m0s", "h0m0sexual", "h0m0sexuals",
  "j3w", "j3ws", "j3wish", "j3ws",
  "k1ll", "k1ll yourself", "k1ll yourself", "k1llers",
  "k1ke", "k1kes", "k1k3", "k1k3s",
  "l3sbian", "l3sbians", "l3sbo", "l3sb0",
  "n1gger", "n1ggers", "n1gga", "n1ggas", "n1g", "n1gs",
  "n@zi", "n@zis", "n@zi", "n@z!",
  "p3n1s", "p3n1ses", "p3nis", "p3nises",
  "p0rn", "p0rno", "p0rnography",
  "r4p3", "r4p3s", "r4pist", "r4pists",
  "sh1t", "sh1ts", "sh1tter", "sh1tting",
  "slut", "slutty", "slutz",
  "t3sticle", "t3sticles", "t3st1cle", "t3st1cles",
  "v4g1na", "v4g1nas", "v4gina", "v4ginas",
  "w4nk", "w4nker", "w4nkers",
  "wh0r3", "wh0r3s", "wh0re",
  "ch1nk", "ch1nks", "ch1ng", "ch1ngs",
  "g00k", "g00ks", "g00kz",
  "b00b", "b00bies", "b00bier", "b00bz",
  "d0uchebag", "d0uchebags", "d0uche", "d0ushe",
  "f4g", "f4ggot", "f4ggots", "f4ggy",
  "h0m0", "h0m0s", "h0m0phobe", "h0m0phobia",
  "j3w", "j3ws", "j3wish", "j3wz",
  "k1ke", "k1kes", "k1k3", "k1k3s",
  "n1gg3r", "n1gg3rs", "n1gga", "n1ggas", "n1gg3rz",
  "p3d0", "p3dophil3", "p3dophile", "p3dophilia",
  "r4p3", "r4p3d", "r4pist", "r4pists", "r4p3s",
  "sh1t", "sh1thead", "sh1ts", "sh1tty",
  "sl4v3", "sl4very", "sl4ves",
  "tr4nny", "tr4nnies", "tr4nny",
  "w3tb4ck", "w3tb4cks", "w3tback", "w3tbacks",
  "kill yourself", "kill_yourself", "kill.yourself",
  "k i l l y o u r s e l f", "k i l l yourself",
  "fuck you", "fuck_you", "fuck.you", "f u c k y o u",
  "fuck off", "fuck_off", "fuck.off",
  "suck it", "suck_it", "suck.it",
  "dick head", "dick_head", "dick.head",
  "ass hole", "ass_hole", "ass.hole",
  "pussy boy", "pussy_boy", "pussy.boy",
  "charlie kirk", "charlie.kirk", "charlie-kirk", "charlie_kirk", "charliekirk", "i_am_charlie_kirk", "kirkcharlie",
  "isreal", "i hate israel", "fuck jews", "kill jews", "kill_jews", "fuck.jews", "fuck_jews", "jews",
  "killyourself", "killyourself", "kill your self", "k i l l your self",
  "k1ll_yourself", "k1ll yourself", "k1ll.yourself",
  "isis", "al-qaeda", "alqaeda", "boko haram", "taliban", "hamas",
  "jihad", "jihadi", "jihadist", "jihadists",
  "white power", "whitepower", "whitepride", "aryan", "aryans",
  "holocaust", "holohoax", "neonazi", "neonazis", "nazi", "nazis",
  "stalin", "hitler", "mussolini", "pol pot", "mao", "che guevara", "bin laden",
  "terrorist", "terrorists", "terrorism", "terror", "bomb", "explosive",
  "chemical weapon", "biological weapon", "attack", "massacre",
  "genocide", "ethnic cleansing",
  "cancer", "autism", "autistic", "cripple", "cripples",
  "zombie", "zombies", "dead", "corpse", "coffin",
  "suicide", "suicidal", "hang yourself", "jump off a bridge",
  "starvation", "hunger", "homeless",
  "slave", "slavery", "slaves", "master race", "supremacy",
  "abortion", "pro-choice", "pro-life",
  "vaccine", "vaccination", "anti-vax", "vax",
  "pedophile", "pedophilia", "pedo", "pedophile", "child molester",
  "rapist", "rape", "sexual assault", "molest", "molestation",
  "incest", "incestuous",
  "drug", "drugs", "marijuana", "cocaine", "heroin", "meth", "ecstasy", "lsd",
  "overdose", "addict", "addiction", "alcoholic", "alcoholism",
  "porn", "porno", "pornography", "xxx", "adult content",
  "🖕", "🖕🏻", "🖕🏼", "🖕🏽", "🖕🏾", "🖕🏿",
  "💀", "💣", "🔞", "💩", "🍆", "🍑", "👹", "👿", "👽", "🤡",
  "f*ck", "f**k", "f***", "f****", "sh*t", "sh*ts", "sh*t", "sh*tting",
  "a$$", "a$$hole", "a$$h0le", "a$$holes", "a$$hat", "a$$hats",
  "c*nt", "c*nts", "c*nty",
  "f*ggot", "f*ggots", "f*ggotry",
  "n*gga", "n*ggas", "n*gger", "n*ggers",
  "k*ke", "k*kes", "k*kes",
  "w*tback", "w*tbacks",
  "g**k", "g**ks",
  "r*tard", "r*tards", "r*tarded",
  "sp*z", "sp*stic",
  "tr*nny", "tr*nnies",
  "fuuuuck", "fuuuuuck", "shiiiit", "shiiiiit", "biiiitch",
  "nigg---", "nigg___", "nigg...", "nigg   ",
  "f*ck1ng", "f*ck1ng", "f*ck3r", "f*ck3d",
  "sh1t", "sh1thead", "sh1ts", "sh1tty",
  "bastardos", "bastinado", "bollocks", "bollox", "bolloxed",
  "bugger", "buggered", "buggery", "bullsh*t", "bullsh1t",
  "cocksucker", "cocksuckers", "cocksucking", "cowshit", "crapola",
  "crapper", "crapulence", "cuntface", "cuntfucker", "cuntlicker",
  "damn", "damned", "damnit", "darn", "darned", "dickhead", "dickheads",
  "dickwad", "dickwads", "dipshit", "dipshits", "dipstick", "dipsticks",
  "douche", "douchebag", "douchebags", "dumbass", "dumbasses", "dumbfuck",
  "dumbfucks", "dumbshit", "dumbshits", "dyke", "dykes", "effing",
  "fart", "farts", "fatass", "fatasses", "felch", "felcher", "fellate",
  "fellatio", "fisting", "flogging", "frig", "frigger", "frigging",
  "fuckboy", "fuckboys", "fuckers", "fuckhead", "fuckheads", "fuckin",
  "fucknut", "fucknuts", "fucktard", "fucktards", "fuckup", "fuckups",
  "god damn", "goddamn", "god-damn", "godam", "godamned", "godammit",
  "gosh darn", "gosh-darn", "gosh dam",
  "hard-on", "hardon", "hell", "hells", "jackass", "jackasses",
  "jap", "japs", "jerkface", "jerkfaces", "jerkoff", "jerkoffs",
  "jism", "jiz", "jizm", "jizz", "jizzed", "jizzing",
  "kike", "kikes", "kunt", "kunts", "kyke", "kykes",
  "lesbian", "lesbians", "lesbo", "lesbos",
  "lezzie", "lezzies", "lezzy",
  "masturbator", "masturbators", "milf", "milfs", "minge", "minger",
  "mingers", "motherfucker", "motherfuckers", "motherfuckin", "motherfucking",
  "muff", "muffin", "muffins", "mung", "munging", "murder", "murderer",
  "murderers", "murdering", "murderous",
  "negro", "negros", "nigger", "niggerz", "nigguh", "nigguhs",
  "numbnuts", "nutjob", "nutjobs", "nutsack", "nutsacks",
  "orgy", "orgies", "paki", "pakis", "pecker", "peckerhead",
  "peckers", "pedo", "pedophile", "pedophilia", "pedophilic",
  "penis", "penises", "penishead", "penisheads", "peon", "peons",
  "pikey", "pikeys", "pillock", "pillocks", "pimp", "pimping",
  "pimps", "pissed", "pisser", "pissers", "pisshead", "pissheads",
  "pissin", "pissing", "pissoff", "piss off", "pissed off",
  "playboy", "playboys", "pleb", "plebs", "plonker", "plonkers",
  "pornographic", "pornography", "pornstar", "pornstars",
  "poxy", "prick", "prickhead", "pricks", "prostitute", "prostitutes",
  "prostitution", "punani", "punany", "punkass", "punkasses",
  "punta", "punters", "pusse", "pussies", "pussy", "pussycat",
  "pussycats", "queef", "queefs", "queer", "queers", "quim", "quims",
  "raghead", "ragheads", "randy", "raped", "raper", "rapers", "rapes",
  "raping", "rapist", "rapists", "ratfink", "ratfinks", "rectum",
  "rectums", "redneck", "rednecks", "renob", "renobs", "retard",
  "retarded", "retardedly", "retards", "rimjob", "rimjobs", "rimming",
  "sadomasochism", "sadomasochist", "screw", "screwed", "screwing",
  "screws", "scrotum", "scrotums", "scum", "scumbag", "scumbags",
  "sex", "sexism", "sexist", "sexual", "sexually", "shack", "shagged",
  "shagging", "shemale", "shemales", "shitface", "shitfaced",
  "shithead", "shitheads", "shithole", "shitholes", "shitload",
  "shitloads", "shits", "shitter", "shitters", "shittiest", "shitting",
  "shitty", "shocker", "shockers", "skank", "skanks", "slag", "slags",
  "slimeball", "slimeballs", "slutbag", "slutbags", "slutted",
  "sluttier", "sluttiest", "slutting", "slutty", "smeg", "smeghead",
  "smegheads", "snatch", "snatches", "son-of-a-bitch", "son-of-a-bitch",
  "sonofabitch", "sonofabitches", "spaz", "spazzed", "spazzes", "spastic",
  "spastics", "spineless", "spinster", "spunk", "spunks", "stfu",
  "stiffy", "stiffys", "stoner", "stoners", "strip", "stripped",
  "stripper", "strippers", "stripping", "stroke", "stroked", "strokes",
  "stroking", "stud", "studs", "stupid", "stupider", "stupidest",
  "suck", "sucked", "sucker", "suckers", "sucking", "sucks",
  "tampon", "tampons", "tard", "tards", "testes", "testicle",
  "testicles", "threesome", "threesomes", "tit", "tits", "titties",
  "titty", "toerag", "toerags", "tosm", "tosser", "tossers",
  "tramp", "tramps", "transvestite", "transvestites", "trash",
  "trashed", "trashy", "troll", "trolls", "twat", "twats", "twatting",
  "urine", "urinate", "urination", "vagina", "vaginas", "vibrator",
  "vibrators", "virgin", "virgins", "vomit", "vomiting", "vulva",
  "vulvas", "wank", "wanked", "wanker", "wankers", "wanking",
  "wanks", "weed", "weeds", "weirdo", "weirdos", "whack", "whacked",
  "whacker", "whackers", "whacking", "whacks", "whore", "whored",
  "whorehouse", "whores", "whoring", "willie", "willies", "willy",
  "winey", "wino", "winos", "witless", "witlessly", "wog", "wogs",
  "wombat", "wombats", "wop", "wops", "x-rated", "xxx", "yank",
  "yankee", "yankees", "yanks", "yob", "yobs", "yuk", "yuks",
  "zero", "zeros", "zipperhead", "zipperheads", "zoophile", "zoophiles",
  "f_u_c_k_e_r", "f_u_c_k_i_n_g", "m_o_t_h_e_r_f_u_c_k_e_r",
  "k_i_l_l", "k_i_l_l_j_e_w_s", "k_i_l_l_y_o_u_r_s_e_l_f",
  "h_i_t_l_e_r", "n_a_z_i", "r_a_p_e", "c_h_i_l_d_m_o_l_e_s_t_e_r",
  "b_i_t_c_h", "c_u_n_t", "d_i_c_k", "p_u_s_s_y", "s_h_i_t",
  "d_a_m_n", "h_e_l_l", "d_a_m_n_i_t", "g_o_d_d_a_m_n",
  "a_s_s_h_o_l_e", "f_a_g_g_o_t", "n_i_g_g_e_r", "n_i_g_g_a",
  "p_e_d_o", "p_e_d_o_p_h_i_l_e", "r_a_p_i_s_t",
  "t_r_a_n_n_y", "w_h_o_r_e", "w_a_n_k_e_r", "s_l_u_t",
  "b_a_s_t_a_r_d", "b_i_t_c_h_e_r", "b_i_t_c_h_i_n_g",
  "c_o_c_k_s_u_c_k_e_r", "d_i_c_k_h_e_a_d", "d_o_u_c_h_e_b_a_g",
  "f_u_c_k_b_o_y", "f_u_c_k_t_a_r_d", "j_a_c_k_a_s_s",
  "m_o_t_h_e_r_f_u_c_k_i_n_g", "p_r_i_c_k", "s_o_n_o_f_a_b_i_t_c_h",
    "Fuck", "FUCK", "Fuk", "FUK", "Shit", "SHIT", "Ass", "ASS",
  "Bitch", "BITCH", "Cunt", "CUNT", "Dick", "DICK", "Pussy", "PUSSY",
  "Nigger", "NIGGER", "Nigga", "NIGGA", "Faggot", "FAGGOT",
  "ffuucckk", "shhiitt", "bbiittcchh", "aassss", "nniiggeerr", "ffaaggggoott",
  "ppuussyy", "ccuunntt", "ddiicckk", "ppoorrnn", "rraappee",
  "kkiillll", "jjeeeeewwss", "hhiittlleerr", "nnaazzii",
  ".fuck", "fuck.", "_fuck_", "-fuck-", "+fuck+", "=fuck=", "#fuck#",
  "@fuck", "fuck@", "!fuck!", "~fuck~", "`fuck`", "'fuck'",
  "fuxk", "fuxing", "fuxker", "sh1t", "sh!t", "sh!tty", "sh!tface",
  "b1tch", "b1tche", "b1tchn", "c0ck", "c0ckhead", "c0cky",
  "d1ck", "d1ckhead", "d1ckwad", "d0uche", "d0ush", "d0ushey",
  "f4g", "f4gs", "f4gg", "f4gg0t", "f4ggy", "f4g3t",
  "g00k", "g00ker", "g00kz", "g00ky",
  "h0m0", "h0m0sexual", "h0m0phobe", "h0m0phobic",
  "j3w", "j3wish", "j3w3d", "j3wz", "k1k3", "k1k3s", "k1k3r",
  "l3z", "l3zb0", "l3zb1an", "l3zbians",
  "m0nk3y", "m0nk3ys", "m0nkey", "m0nkeys",
  "n1gga", "n1ggas", "n1gger", "n1ggers", "n1gg3r", "n1gg3rs", "n1gg4",
  "p3d0", "p3d0s", "p3dophil3", "p3dophilic", "p3dophil1a",
  "r4p3", "r4p3d", "r4p1st", "r4pists", "r4p3s", "r4p3r",
  "sh1t", "sh1ts", "sh1tty", "sh1thead", "sh1tface",
  "tr4nny", "tr4nnies", "tr4n5", "tr4n5vestite",
  "v4gina", "v4ginas", "v4g1na", "v4g1nas",
  "w4nk", "w4nk3r", "w4nker", "w4nking",
  "w3tb4ck", "w3tb4cks", "w3tback", "w3tbacks",
  "wh0r3", "wh0r3s", "wh0re", "wh0r3d",
  "beaner", "beaners", "borderhopper", "wetbag", "wetbacky",
  "chinaman", "chinamen", "ching chong", "chingchong", "jap", "japs", "nip", "nips",
  "coon", "coons", "coonass", "camel jockey", "sand nigger", "towelhead", "raghead",
  "redskin", "redskins", "injun", "injuns",
  "papist", "fenian", "taig", "taigs", "hun", "huns",
  "yid", "yids", "heeb", "heebs",
  "spick", "spicks", "spic", "spics",
  "wop", "wops", "guinea", "guineas", "dago", "dagos",
  "mick", "micks", "paddy", "paddies",
  "kraut", "krauts", "jerry", "jerries",
  "frog", "frogs", "frenchy",
  "ruski", "ruskies", "commie", "commies",
  "slope", "slopes", "gooky", "gooks", "gooker",
  "jungle bunny", "porch monkey", "spade", "spades", "darkie", "darkies",
  "abo", "abos", "jacky", "jackies",
  "curry muncher", "raghead", "turbanator",
  "cholo", "cholos", "ese",
  "gypsy", "gypsies", "pikey", "pikies",
  "wigger", "wiggers", "whigger", "whiggers",
  "trashy", "white trash", "redneck", "hillbilly", "trailer trash",
  "jesus freak", "bible basher", "christ-tard",
  "mohammedan", "muzzie", "muzzie", "muslime", "moslem",
  "cult", "cultist", "satan", "satanist", "666", "mark of the beast",
  "god hater", "godhater", "religiot", "religious nut",
  "cripple", "cripples", "gimp", "gimpy", "freak", "freaks",
  "lame", "lamer", "invalid",
  "psycho", "psychos", "schizo", "schizos", "sicko", "sickos",
  "nutter", "nutters", "wacko", "wackos", "kook", "kooks",
  "deranged", "insane", "lunatic", "lunatics",
  "short bus", "special bus", "window licker",
  "mong", "mongol", "mongoloid", "downie", "downy", "downs",
  "spacker", "spackers", "spakker", "spazmo", "spazmoid",
  "thicko", "thickos", "dimwit", "dimwits", "ignoramus",
  "a$$h0l3", "a$$h0l3s", "a$$h0le", "a$$h0les",
  "b!+ch", "b!tch3s", "b!tch3z",
  "c0cksuck3r", "c0cksuck3rs", "c0cksuck1ng",
  "d4mn", "d4mned", "d4mmit",
  "f4gg0t", "f4gg0ts", "f4gg0try",
  "g0dd4mn", "g0dd4mn1t",
  "h3ll", "h3lls", "h3llish",
  "j3rk", "j3rks", "j3rkface",
  "k1ll3r", "k1ll3rs", "k1llj0y",
  "l4m3", "l4m3r", "l4m3st",
  "m0r0n", "m0r0ns", "m0r0nic",
  "n1ghtm4r3", "n0th1ng", "n00b", "n00bs",
  "p3rv", "p3rv3rt", "p3rv3rts",
  "q33r", "q33rs", "qu33r",
  "r3t4rd", "r3t4rd3d", "r3t4rds",
  "s3x", "s3xual", "s3xuality",
  "t3rr0r", "t3rr0rist", "t3rr0rists",
  "v1rgin", "v1rgins", "v1rg1n",
  "w1mp", "w1mps", "w1mpy",
  "z3r0", "z3r0s", "z3r0ed",
  "f_u_c_k_e_r", "f_u_c_k_i_n_g", "m_o_t_h_e_r_f_u_c_k_e_r",
  "k_i_l_l", "k_i_l_l_j_e_w_s", "k_i_l_l_y_o_u_r_s_e_l_f",
  "h_i_t_l_e_r", "n_a_z_i", "r_a_p_e", "c_h_i_l_d_m_o_l_e_s_t_e_r",
  "b_i_t_c_h", "c_u_n_t", "d_i_c_k", "p_u_s_s_y", "s_h_i_t",
  "d_a_m_n", "h_e_l_l", "d_a_m_n_i_t", "g_o_d_d_a_m_n",
  "a_s_s_h_o_l_e", "f_a_g_g_o_t", "n_i_g_g_e_r", "n_i_g_g_a",
  "p_e_d_o", "p_e_d_o_p_h_i_l_e", "r_a_p_i_s_t",
  "t_r_a_n_n_y", "w_h_o_r_e", "w_a_n_k_e_r", "s_l_u_t",
  "b_a_s_t_a_r_d", "b_i_t_c_h_e_r", "b_i_t_c_h_i_n_g",
  "c_o_c_k_s_u_c_k_e_r", "d_i_c_k_h_e_a_d", "d_o_u_c_h_e_b_a_g",
  "f_u_c_k_b_o_y", "f_u_c_k_t_a_r_d", "j_a_c_k_a_s_s",
  "m_o_t_h_e_r_f_u_c_k_i_n_g", "p_r_i_c_k", "s_o_n_o_f_a_b_i_t_c_h",
  "assface", "assclown", "asshat", "asshead", "assmaster",
  "buttface", "butthead", "buttmunch", "dirtbag", "dirtbags",
  "douchenozzle", "douchenozzles", "dumbfuck", "dumbfucks",
  "fuckface", "fuckhead", "fuckstick", "fuckwad", "fuckwads",
  "jerkwad", "jerkwads", "pisshead", "pissbrain", "shitbag",
  "shitbags", "shitbird", "shitbirds", "shitcan", "shitcans",
  "shitforbrains", "shitshow", "shitshows", "skanky", "skankier",
  "skankiest", "sleazebag", "sleazebags", "sleazeball", "sleazeballs",
  "slutbucket", "slutbuckets", "slutface", "slutfest", "slutmaster",
  "twatwaffle", "twatwaffles", "douchecanoe", "douchecanoes",
  "merde", "scheisse", "mafi", "Kuma", "Makende", "kuma", "makende",
  "kut", "kanker", "tyfus", "tering", "Matako", "matako", "paska", "perse",
  "perkele", "saatana", "vittu", "joder", "coño", "mierda", "puta",
  "putain", "bordel", "merde", "kurva", "kurwa", "pizda", "huj", "chuj",
  "chuja", "kurwa", "cyka", "blyat", "suka", "ebat", "ebal", "jebat",
  "debil", "idiota", "idioti", "kretin", "kretini", "debil",
  "g4s the k1kes", "gas the jews", "kill all n1ggers", "kill all jews",
  "white genocide", "great replacement", "hitler was right",
  "sieg heil", "heil hitler", "14 words", "88", "heil",
  "kukluxklan", "kkk", "white power", "whitepower", "aryan pride",
  "south will rise again", "confederate forever",
  "rape all women", "kill all men", "fuck feminism", "feminazi",
  "feminazis", "meninist", "mgow", "incel", "incels", "redpill",
  "blackpill", "bluepilled", "mgtow", "men going their own way",
 
];

const containsBannedWord = (str: string) => {
  const lower = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((w) => lower.includes(w.replace(/[^a-z0-9]/g, "")));
};

const LS_FAIL_KEY      = "10odds_cm_ft";
const LS_BAN_KEY       = "10odds_cm_bot_blocker";
const LS_SUBMITTED_KEY = "10odds_cm_conjunction_pipeline";
const MAX_FAILS        = 3;

const getFailCount    = () => parseInt(localStorage.getItem(LS_FAIL_KEY) ?? "0", 10);
const incrementFail   = () => localStorage.setItem(LS_FAIL_KEY, String(getFailCount() + 1));
const isBrowserBanned = () => localStorage.getItem(LS_BAN_KEY) === "true";
const banBrowser      = () => localStorage.setItem(LS_BAN_KEY, "true");
const hasSubmitted    = () => localStorage.getItem(LS_SUBMITTED_KEY) === "true";
const markSubmitted   = () => localStorage.setItem(LS_SUBMITTED_KEY, "true");

interface Member { id: number; username: string; avatar: string; created_at: string; }
interface Team   { id: number; name: string; crest_url: string; }

// ─── HBOOKS hardcoded VIP profile ─────────────────────────────────────────────
const HBOOKS_MEMBER: Member = {
  id: -1,
  username: "HBOOKS",
  avatar: "", // no crest – uses a custom render
  created_at: "2024-01-01T00:00:00Z",
};

const ACCENTS = [
  "#f4a261","#2a9d8f","#457b9d","#e9c46a",
  "#8338ec","#06d6a0","#ef476f","#ffd166","#118ab2","#e63946",
];

// ─── BannedScreen ─────────────────────────────────────────────────────────────
const BannedScreen = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-950 text-white">
    <div className="text-8xl mb-6">⛔</div>
    <h1 className="text-3xl font-bold tracking-tight mb-2">YOU HAVE BEEN BANNED</h1>
    <p className="text-red-300 text-sm max-w-xs text-center">
      This IP address has been blocked from the community board due to repeated policy violations.
    </p>
  </div>
);

// ─── Animated background ──────────────────────────────────────────────────────
const Background = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base dark gradient */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 120% 80% at 50% -10%, #0d2137 0%, #060d18 60%, #020508 100%)"
      }} />

      {/* Animated mesh orbs */}
      <motion.div
        className="absolute rounded-full blur-[120px]"
        style={{ width: 700, height: 500, top: -100, left: "20%", background: "radial-gradient(circle, rgba(16,100,60,0.25) 0%, transparent 70%)" }}
        animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{ width: 500, height: 400, bottom: "10%", right: "-5%", background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)" }}
        animate={{ x: [0, -50, 30, 0], y: [0, -30, 20, 0], scale: [1, 0.9, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-[80px]"
        style={{ width: 350, height: 350, top: "40%", left: "-8%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
        animate={{ y: [0, 60, -40, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      />

      {/* Diagonal pitch-line pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
          <pattern id="center-circle" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
            <circle cx="200" cy="200" r="80" fill="none" stroke="white" strokeWidth="0.6" />
            <line x1="0" y1="200" x2="400" y2="200" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#center-circle)" />
      </svg>

      {/* Animated floating particles */}
      {[...Array(18)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#10b981" : "#818cf8",
            opacity: 0.5,
          }}
          animate={{
            y: [0, -40 - Math.random() * 60, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{
            repeat: Infinity,
            duration: 5 + Math.random() * 8,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Bottom green pitch glow */}
      <div className="absolute bottom-0 left-0 right-0 h-48" style={{
        background: "linear-gradient(to top, rgba(5,46,22,0.35) 0%, transparent 100%)"
      }} />
    </div>
  );
};

// ─── HBOOKS VIP Card ──────────────────────────────────────────────────────────
const HBooksCard = () => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -10, scale: 1.06 }}
      className="relative flex flex-col items-center gap-3 rounded-2xl p-4 cursor-default col-span-1"
      style={{
        background: "linear-gradient(135deg, rgba(234,179,8,0.18) 0%, rgba(234,179,8,0.06) 50%, rgba(251,146,60,0.12) 100%)",
        border: "1.5px solid rgba(234,179,8,0.55)",
        boxShadow: hovered
          ? "0 0 40px rgba(234,179,8,0.5), 0 8px 32px rgba(234,179,8,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
          : "0 0 20px rgba(234,179,8,0.25), 0 4px 20px rgba(234,179,8,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Animated gold shimmer line at top */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, transparent, #fbbf24, #f59e0b, #fbbf24, transparent)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />

      {/* Crown badge */}
      <motion.div
        className="absolute -top-3 -right-2 h-6 w-6 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#f59e0b,#dc2626)", boxShadow: "0 2px 8px rgba(245,158,11,0.6)" }}
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
      >
        <Crown className="h-3.5 w-3.5 text-white" />
      </motion.div>

      {/* Avatar – custom gold "H" monogram */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#f59e0b,#b45309)",
          boxShadow: "0 0 0 2.5px rgba(251,191,36,0.8), 0 0 16px rgba(245,158,11,0.4)",
        }}
      >
        <motion.span
          className="text-xl font-black text-white drop-shadow-md"
          animate={{ scale: hovered ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.4 }}
        >
          HP
        </motion.span>
        {/* Inner shimmer */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)" }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 leading-tight">
          HBOOKS
        </p>
        <p className="text-[9px] text-amber-400/60 font-semibold mt-0.5 uppercase tracking-widest">
          Founding Supporter
        </p>
      </div>

      {/* Bottom sparkle row */}
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}>
            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
          </motion.div>
        ))}
      </div>

      {/* Corner sparkles */}
      <Sparkles className="absolute bottom-2 left-2 h-3 w-3 text-amber-400/40" />
    </motion.div>
  );
};

// ─── Regular member card ──────────────────────────────────────────────────────
const MemberCard = ({ m, index }: { m: Member; index: number }) => {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.82, rotate: -3 },
        show:   { opacity: 1, y: 0,  scale: 1,    rotate: 0 },
      }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      whileHover={{ y: -7, scale: 1.06, rotate: 1 }}
      className="relative flex flex-col items-center gap-3 rounded-2xl p-4 cursor-default"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1.5px solid ${accent}45`,
        boxShadow: `0 4px 24px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* Avatar ring */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.06)",
          boxShadow: `0 0 0 2px ${accent}60`,
        }}
      >
        <CrestImage
          url={m.avatar}
          alt=""
          className="!w-10 !h-10 drop-shadow-md"
        />
      </div>

      <p className="text-xs font-bold text-center text-white/90 leading-tight break-all">
        {m.username}
      </p>

      <Sparkles className="absolute top-2 right-2 h-3 w-3 opacity-25" style={{ color: accent }} />
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const CommunityPage = () => {
  const [banned, setBanned]                   = useState(isBrowserBanned());
  const [alreadySubmitted, setAlreadySubmitted] = useState(hasSubmitted());
  const [members, setMembers]                 = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers]   = useState(true);
  const [modalOpen, setModalOpen]             = useState(false);
  const [teams, setTeams]                     = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams]       = useState(false);

  // form
  const [realName, setRealName]               = useState("");
  const [username, setUsername]               = useState("");
  const [selectedAvatar, setSelectedAvatar]   = useState("");
  const [isSupporter, setIsSupporter]         = useState(false);
  const [termsAgreed, setTermsAgreed]         = useState(false);
  const [fieldError, setFieldError]           = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [confirmChecked, setConfirmChecked]   = useState(false);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  const fetchMembers = async () => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from("community_members")
      .select("id, username, avatar, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    setMembers((data as Member[]) ?? []);
    setLoadingMembers(false);
  };

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (banned) return;

    fetchMembers();

    const channel = supabase
      .channel("community-board-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        (payload) => {
          const row = payload.new as (Member & { status: string }) | null;
          const oldRow = payload.old as (Member & { status?: string }) | null;

          if (payload.eventType === "UPDATE") {
            if (row?.status === "approved") {
              // Add to board if newly approved
              setMembers((prev) => {
                const exists = prev.find((m) => m.id === row.id);
                if (exists) return prev;
                const newMember: Member = { id: row.id, username: row.username, avatar: row.avatar, created_at: row.created_at };
                return [newMember, ...prev];
              });
            } else if (row?.status === "banned" || row?.status === "rejected") {
              // Remove from board if banned/rejected
              setMembers((prev) => prev.filter((m) => m.id !== row.id));
            }
          } else if (payload.eventType === "DELETE") {
            setMembers((prev) => prev.filter((m) => m.id !== (oldRow?.id ?? -999)));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [banned]);

  // ── Teams fetch on modal open ──────────────────────────────────────────────
  const openModal = async () => {
    if (banned || alreadySubmitted) return;
    setModalOpen(true);
    if (teams.length === 0) {
      setLoadingTeams(true);
      const { data } = await supabase.from("teams").select("id, name, crest_url").order("name");
      setTeams((data as Team[]) ?? []);
      setLoadingTeams(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setFieldError("");
    setSubmitted(false);
    setShowConfirm(false);
    setConfirmChecked(false);
    setRealName(""); setUsername(""); setSelectedAvatar("");
    setIsSupporter(false); setTermsAgreed(false);
  };

  const sanitise = (raw: string) => raw.replace(/<[^>]*>/g, "").trim().slice(0, 30);

  const handleFormValidation = (): boolean => {
    setFieldError("");
    const cleanName = realName.trim();
    const cleanUser = sanitise(username);
    if (!cleanName)           { setFieldError("Please enter your full name."); return false; }
    if (!cleanUser)           { setFieldError("Please enter a username."); return false; }
    if (cleanUser.length < 2) { setFieldError("Username must be at least 2 characters."); return false; }
    if (!selectedAvatar)      { setFieldError("Please select a team avatar."); return false; }
    if (!isSupporter)         { setFieldError("Please confirm you have supported the project."); return false; }
    if (!termsAgreed)         { setFieldError("Please agree to the community terms."); return false; }
    if (containsBannedWord(cleanUser)) {
      const fails = getFailCount() + 1;
      incrementFail();
      if (fails >= MAX_FAILS) { banBrowser(); setBanned(true); return false; }
      setFieldError(`That username isn't allowed, please choose another. (Warning ${fails}/${MAX_FAILS})`);
      return false;
    }
    return true;
  };

  const handleInitialSubmit = () => {
    if (handleFormValidation()) setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    const cleanName = realName.trim();
    const cleanUser = sanitise(username);
    const { error } = await supabase.from("community_members").insert({
      real_name: cleanName, username: cleanUser, avatar: selectedAvatar,
      is_supporter: isSupporter, terms_agreed: termsAgreed, status: "pending",
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") { setFieldError("That username is already taken."); setShowConfirm(false); return; }
      setFieldError("Something went wrong. Please try again."); setShowConfirm(false); return;
    }
    setSubmitted(true); setShowConfirm(false); setConfirmChecked(false);
    markSubmitted(); setAlreadySubmitted(true);
  };

  if (banned) return <BannedScreen />;

  const canSubmit = realName.trim() && username.trim() && selectedAvatar && isSupporter && termsAgreed;
  const totalCount = members.length + 1; // +1 for HBOOKS

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Background />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">

        {/* ── Back button ─────────────────────────────────────────────────── */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/90 transition-colors mb-10 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Back to Home
        </Link>

        {/* ══════════════════════════════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          {/* Animated trophy icon */}
          <div className="relative inline-block mb-5">
            <motion.div
              animate={{ rotate: [-4, 4, -4], y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="inline-flex items-center justify-center h-24 w-24 rounded-3xl"
              style={{
                background: "linear-gradient(135deg,#f59e0b,#d97706,#b45309)",
                boxShadow: "0 0 0 8px rgba(245,158,11,0.12), 0 20px 60px rgba(245,158,11,0.35)",
              }}
            >
              <Trophy className="h-12 w-12 text-white drop-shadow-lg" />
            </motion.div>
            {/* Orbiting sparkles */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  top: "50%", left: "50%",
                  transformOrigin: "0 0",
                }}
                animate={{ rotate: [deg, deg + 360] }}
                transition={{ repeat: Infinity, duration: 8 + i, ease: "linear" }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{
                    marginLeft: 52,
                    background: i % 2 === 0 ? "#f59e0b" : "#10b981",
                    boxShadow: `0 0 6px ${i % 2 === 0 ? "#f59e0b" : "#10b981"}`,
                  }}
                />
              </motion.div>
            ))}
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight mb-4">
            <span className="text-white">Our </span>
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #fbbf24, #f59e0b, #fb923c, #ef4444)" }}
            >
              Amazing
            </span>
            <br />
            <span className="text-white">Supporters </span>
            <motion.span
              animate={{ scale: [1, 1.3, 1], rotate: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block"
            >
              🏆
            </motion.span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-4">
            These legends keep 10 Odds alive. Each name here represents a{" "}
            <span className="text-amber-400 font-semibold">real person</span> who believed
            in this project and helped make it happen.
          </p>

          {/* CTA banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))",
              border: "1px solid rgba(245,158,11,0.35)",
              boxShadow: "0 0 30px rgba(245,158,11,0.15)",
            }}
          >
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-white/80">Support the project → Get your name on the board forever</span>
            <Heart className="h-4 w-4 text-red-400" />
          </motion.div>

          {/* Stats row */}
          {!loadingMembers && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/12 border border-emerald-500/25 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {totalCount} supporter{totalCount !== 1 ? "s" : ""} on the board
              </div>
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-500/12 border border-amber-500/25 text-amber-400">
                <Zap className="h-3 w-3" />
                Live · Community
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════
            HOW IT WORKS STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-3 mb-12 max-w-2xl mx-auto"
        >
          {[
            { icon: "💸", label: "Support the project", sub: "Ko-fi, PayPal or any way" },
            { icon: "📝", label: "Submit your profile", sub: "Takes 30 seconds" },
            { icon: "✨", label: "Appear on the board", sub: "Forever recognised" },
          ].map((step, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -3, scale: 1.03 }}
              className="flex flex-col items-center gap-1.5 p-4 rounded-2xl text-center"
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-2xl">{step.icon}</span>
              <p className="text-xs font-bold text-white/80">{step.label}</p>
              <p className="text-[10px] text-white/35">{step.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════
            MEMBER GRID
        ══════════════════════════════════════════════════════════════════ */}
        {loadingMembers ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-amber-400/60" />
            <p className="text-white/30 text-sm">Loading supporters…</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-36"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          >
            {/* HBOOKS always first */}
            <HBooksCard />

            {/* Live member cards */}
            <AnimatePresence>
              {members.map((m, i) => (
                <MemberCard key={m.id} m={m} index={i} />
              ))}
            </AnimatePresence>

            {/* Empty state when no other members */}
            {members.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full mt-8 text-center"
              >
                <Star className="h-8 w-8 mx-auto mb-2 text-white/15" />
                <p className="text-white/25 text-sm">Be the next one on the board!</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Floating join button ───────────────────────────────────────────── */}
      {alreadySubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 text-xs font-semibold text-white/70 px-4 py-3 rounded-2xl backdrop-blur-md shadow-lg"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Submission Sent! Once approved, you'll appear on the board within 1–2 business days.
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.96 }}
          onClick={openModal}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 text-sm font-black px-6 py-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#f59e0b,#ea580c)",
            boxShadow: "0 8px 40px rgba(245,158,11,0.45), 0 2px 8px rgba(0,0,0,0.3)",
            color: "#fff",
          }}
        >
          <Plus className="h-5 w-5" />
          Join the Board
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            ✨
          </motion.span>
        </motion.button>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          JOIN MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-40 bg-black/85 backdrop-blur-lg"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.86, y: 30 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.86, y: 30 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
                style={{ background: "rgba(8,14,26,0.98)", border: "1px solid rgba(245,158,11,0.2)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Thin gold header bar */}
                <div className="h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg,#f59e0b,#ea580c,#f59e0b)" }} />

                {submitted ? (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                      <CheckCircle className="h-16 w-16 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-2xl font-black">Request submitted! 🎉</h2>
                    <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                      Your request is being reviewed. If approved, you'll appear on the board within 1–2 business days.
                      If it doesn't show up after that, it means the submission wasn't accepted.
                    </p>
                    <button
                      onClick={closeModal}
                      className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
                    >
                      Awesome, close
                    </button>
                  </div>
                ) : (
                  <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-black">Join the Board</h2>
                        <p className="text-xs text-white/35 mt-0.5">All fields required · One submission per person</p>
                      </div>
                      <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/8 text-white/35 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Full name */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Full Name</label>
                      <p className="text-[11px] text-white/25">Never displayed – for internal verification only.</p>
                      <input
                        type="text"
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        placeholder="Your real name"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Display Name</label>
                      <p className="text-[11px] text-white/25">Shown on the board. Max 30 characters.</p>
                      <input
                        type="text"
                        value={username}
                        maxLength={30}
                        onChange={(e) => setUsername(e.target.value.replace(/<[^>]*>/g, "").slice(0, 30))}
                        placeholder="e.g. GoalMaster99"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"
                      />
                    </div>

                    {/* Avatar grid */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Team Avatar</label>
                      <p className="text-[11px] text-white/25">Pick the crest displayed on your card.</p>
                      {loadingTeams ? (
                        <div className="flex justify-center py-6"><RefreshCw className="h-4 w-4 animate-spin text-white/30" /></div>
                      ) : (
                        <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {teams.map((t) => (
                            <button
                              key={t.id} type="button"
                              onClick={() => setSelectedAvatar(t.crest_url)}
                              title={t.name}
                              className={`relative flex items-center justify-center aspect-square rounded-xl border-2 transition-all duration-150 ${
                                selectedAvatar === t.crest_url
                                  ? "border-amber-400 bg-amber-400/15 scale-110 shadow-lg shadow-amber-400/20"
                                  : "border-white/10 bg-white/5 hover:border-white/25"
                              }`}
                            >
                              <CrestImage url={t.crest_url} alt={t.name} size="sm" className="w-6 h-6"
                               />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Supporter checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={isSupporter} onChange={(e) => setIsSupporter(e.target.checked)}
                        className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer" />
                      <span className="text-xs text-white/45 leading-relaxed group-hover:text-white/65 transition-colors">
                        I have supported the 10 Odds project (Ko‑fi, PayPal, or similar).
                      </span>
                    </label>

                    {/* Terms checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer" />
                      <span className="text-xs text-white/45 leading-relaxed group-hover:text-white/65 transition-colors">
                        I agree to the{" "}
                        <a href="/community-terms" target="_blank" rel="noreferrer"
                          className="text-amber-400 underline underline-offset-2 hover:text-amber-300 inline-flex items-center gap-0.5">
                          community terms <ChevronRight className="h-3 w-3" />
                        </a>
                      </span>
                    </label>

                    {fieldError && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-400">{fieldError}</p>
                      </motion.div>
                    )}

                    <button
                      onClick={handleInitialSubmit}
                      disabled={!canSubmit || submitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-white disabled:opacity-35 disabled:cursor-not-allowed transition-opacity"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)", boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }}
                    >
                      {submitting
                        ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
                        : <>Review My Submission ✨</>
                      }
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRMATION POPUP
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 24 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-sm rounded-2xl border shadow-2xl p-6 space-y-5"
                style={{ background: "rgba(8,14,26,0.99)", borderColor: "rgba(245,158,11,0.25)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-400/15 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black">Confirm your details</h2>
                    <p className="text-xs text-white/35">Double-check before submitting.</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm rounded-xl bg-white/4 border border-white/8 p-4">
                  {[
                    ["Display Name", sanitise(username)],
                    ["Supporter", isSupporter ? "✅ Yes" : "❌ No"],
                    ["Terms Agreed", termsAgreed ? "✅ Yes" : "❌ No"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-white/40 text-xs">{label}</span>
                      <span className="font-bold text-white text-xs">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-xs">Avatar</span>
                    {selectedAvatar
                      ? <img src={selectedAvatar} alt="" className="h-6 w-6 object-contain" />
                      : <span className="font-bold text-white text-xs">—</span>
                    }
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer" />
                  <span className="text-xs text-white/45 leading-relaxed group-hover:text-white/65 transition-colors">
                    I've checked everything and it's correct.
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={!confirmChecked || submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
                  >
                    {submitting
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
                      : <><CheckCircle className="h-4 w-4" /> Confirm & Submit</>
                    }
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityPage;