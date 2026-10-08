// templates.md §1: the phrase lists (English, Hinglish and Devanagari), the negators and the clause breaks.
import type { Bucket } from "../contract";

export type Problem = Exclude<Bucket, "unclassified">;

export const PHRASES: Readonly<Record<Problem, readonly string[]>> = {
  lead_gen: [
    "not enough leads", "no enquiries", "few enquiries", "need more clients", "no new customers", "phone doesn't ring",
    "footfall down", "walk-ins down", "business is slow", "get more customers",
    "lead nahi aa rahe", "enquiry nahi aati", "enquiry kam hai", "client nahi mil rahe", "naye client chahiye",
    "customer nahi aa rahe", "footfall kam", "call nahi aate", "kaam nahi mil raha", "business slow hai", "order kam hai",
    "लीड नहीं", "इंक्वायरी कम", "क्लाइंट नहीं मिल", "ग्राहक नहीं आते", "धंधा मंदा",
  ],
  sales: [
    "don't convert", "not converting", "can't close", "they ghost", "no reply after quote", "only ask the price",
    "price shoppers", "time-pass enquiries", "follow up", "forget to follow up", "slow to reply", "call back", "calls back",
    "gone cold", "go cold", "missed calls", "lose them to competitors",
    "convert nahi hote", "close nahi hota", "deal haath se nikal gayi", "reply nahi karte", "ghost kar dete",
    "sirf rate puchte", "rate sun ke bhaag jaate", "time pass log", "follow up nahi hota", "follow up bhool jaate",
    "call back nahi kiya", "thande pad gaye", "thanda pad gaya", "quotation ke baad gayab", "competitor le gaya",
    "कन्वर्ट नहीं", "डील नहीं होती", "फॉलो अप", "जवाब नहीं देते", "रेट पूछते",
  ],
  ads: [
    "ads burn money", "ads not working", "wasted on ads", "facebook ads", "instagram ads", "meta ads", "google ads",
    "boosted post", "cost per lead", "roas", "ad agency", "marketing budget",
    "ads mein paisa doob gaya", "ads ka paisa barbaad", "ads kaam nahi kar rahe", "boost kiya kuch nahi hua",
    "marketing pe kharcha", "agency ko paisa diya", "lead mehngi padti",
    "विज्ञापन", "ऐड में पैसा", "मार्केटिंग का खर्चा",
  ],
  numbers: [
    "don't know my numbers", "profit", "margin", "cash flow", "where the money goes", "reports", "mis", "p&l",
    "accounts", "gst", "tally", "excel mess",
    "hisaab kitaab", "hisaab nahi pata", "profit pata nahi", "kitna kamaya pata nahi", "paisa kahan ja raha",
    "kharcha", "accounts ka jhanjhat", "gst ka jhanjhat",
    "हिसाब", "मुनाफा", "खर्चा", "पैसा कहाँ जा रहा",
  ],
  payments: [
    "payments stuck", "pending payment", "client hasn't paid", "overdue", "outstanding", "collections", "receivables",
    "invoices", "billing", "dues", "payment follow up", "advance not received",
    "payment atka hai", "paisa fasa hai", "payment pending", "client paisa nahi de raha", "udhaar", "baaki paisa",
    "vasooli", "bill nahi bana", "advance nahi mila", "contractor ka hisaab",
    "पेमेंट अटका", "पैसा फंसा", "उधार", "बकाया", "वसूली",
  ],
  team_ops: [
    "team chaos", "staff", "nothing on time", "delays", "deadlines", "i have to do everything", "depends on me",
    "miscommunication", "track projects", "site updates", "too many whatsapp groups", "paperwork", "manual work",
    "team sambhal nahi", "staff kaam nahi karta", "sab mujhe dekhna padta", "har cheez mere upar",
    "kaam time pe nahi hota", "site pe kya chal raha pata nahi", "gadbad", "coordination nahi",
    "group mein sab bikhra", "register mein likhte", "diary mein likhte",
    "स्टाफ", "टीम", "सब मुझे देखना", "गड़बड़", "देरी",
  ],
  content: [
    "no time for content", "posting", "reels", "videos", "social media", "consistency", "editing", "content ideas",
    "content ka time nahi", "post nahi hota", "reels nahi banti", "video banane ka time nahi",
    "social media sambhal nahi", "roz post",
    "रील", "वीडियो", "सोशल मीडिया", "पोस्ट",
  ],
  support: [
    "customer support", "complaints", "same questions again", "replying all day", "after-sales", "service requests",
    "bad reviews",
    "customer ke sawaal", "complaint aati", "ek hi sawaal baar baar", "reply karte karte thak gaye",
    "after sales service", "bura review",
    "शिकायत", "ग्राहक के सवाल",
  ],
  hiring: [
    "can't find good people", "hiring", "staff leaves", "attrition", "training new staff",
    "achhe log nahi milte", "staff nahi milta", "log chhod ke chale jaate", "naya banda sikhana",
    "स्टाफ नहीं मिलता", "लोग छोड़ देते",
  ],
};

/** Rule 3: a negator cancels a phrase up to 4 words away. A plain "nahi" never does. */
export const NEGATORS: readonly string[] = ["is fine", "no problem", "theek hai", "sahi chal raha", "koi dikkat nahi", "sorted"];

/** Negation never reaches past punctuation or a "but" (see the plan's "Decisions" section). The danda counts as a full stop. */
export const CLAUSE_BREAK = /[.!?;:,\n\u0964]+/u;
/** "par" is left out on purpose: in Hindi it also means "on". */
export const CLAUSE_CONJUNCTIONS: ReadonlySet<string> = new Set(["but", "however", "lekin", "magar", "लेकिन", "मगर"]);
