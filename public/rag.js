/*
 * IIM AI Chatbot — Retrieval-Augmented Knowledge Base
 *
 * Knowledge sources:
 * 1. IIM Africa website data extraction
 * 2. IIM chatbot Q&A dataset
 *
 * This is a lightweight lexical retrieval system.
 * It does not use embeddings or a vector database.
 *
 * Global object:
 * window.IIM_RAG
 */

window.IIM_RAG = (function () {
  "use strict";

  const corpus = [
    /*
     * ============================================================
     * ABOUT IIM
     * ============================================================
     */

    {
      id: "about_iim_overview",
      title: "About the Institute of Information Management",
      category: "About IIM",
      source: "IIM Africa website — About IIM",
      sourceUrl: "https://iim-africa.org/ng/about-iim/",
      verified: true,
      keywords: [
        "iim",
        "what is iim",
        "about iim",
        "institute of information management",
        "organisation",
        "organization",
        "professional body",
        "professional institute",
        "information management institute",
        "international institute",
      ],
      text:
        "The Institute of Information Management, commonly called IIM, is an international, " +
        "professional and membership-driven institute focused on advancing data and information " +
        "management globally. IIM supports professional development, certification, research, " +
        "capacity building and improved management of information assets. Its activities cover " +
        "records management, information management, data management, archives, information " +
        "security and document management.",
    },

    {
      id: "iim_mission",
      title: "IIM Mission and Professional Focus",
      category: "About IIM",
      source: "IIM Africa website — About IIM",
      sourceUrl: "https://iim-africa.org/ng/about-iim/",
      verified: true,
      keywords: [
        "mission",
        "iim mission",
        "vision",
        "purpose",
        "objectives",
        "focus",
        "what does iim do",
        "what does iim focus on",
        "information assets",
        "professional development",
        "research",
      ],
      text:
        "IIM's mission is to help information management professionals remain current with the " +
        "challenges of managing information assets in the era of social technologies, mobile " +
        "technologies, cloud computing and big data. The institute aims to maintain high standards " +
        "in professional certification, competence and research. Its objectives include promoting " +
        "sound information management and research, publishing study materials and journals, " +
        "organising seminars, workshops and conferences, providing training and certification, " +
        "and supporting professional capacity development.",
    },

    {
      id: "iim_legitimacy",
      title: "IIM Registration and Professional Recognition",
      category: "About IIM",
      source: "IIM Africa website — About IIM",
      sourceUrl: "https://iim-africa.org/ng/about-iim/",
      verified: true,
      keywords: [
        "registered",
        "legitimate",
        "legitimacy",
        "recognised",
        "recognized",
        "approved",
        "accredited",
        "licensed",
        "registration",
        "professional body",
        "nonprofit",
        "non-profit",
        "ndpc",
        "federal ministry of education",
      ],
      text:
        "IIM is registered as a nonprofit corporation in Colorado, United States, under Entity ID " +
        "20181786160. It is also registered as a professional body in Nigeria under registration " +
        "number RC 1125723 and is referenced in the National Assembly Gazette. The organisation is " +
        "approved by Nigeria's Federal Ministry of Education under reference " +
        "FME/TED/A&E/ANPB/XLIII/406. IIM is licensed by the Nigeria Data Protection Commission under " +
        "Section 5(f) and 5(h) of the Nigeria Data Protection Act 2023 to conduct examinations and " +
        "certify data protection professionals.",
    },

    {
      id: "iim_locations",
      title: "IIM Headquarters and Global Chapters",
      category: "About IIM",
      source: "IIM Africa website — About IIM",
      sourceUrl: "https://iim-africa.org/ng/about-iim/",
      verified: true,
      keywords: [
        "headquarters",
        "head office",
        "global chapters",
        "chapters",
        "countries",
        "where is iim",
        "where is iim located",
        "international locations",
        "denver",
        "colorado",
        "usa",
        "united kingdom",
        "canada",
        "south africa",
        "australia",
        "switzerland",
        "india",
        "ghana",
        "nigeria",
      ],
      text:
        "IIM's headquarters is in Denver, Colorado, United States. Its listed global chapters include " +
        "the United Kingdom, Canada, South Africa, Australia, Switzerland, India, Ghana and Nigeria. " +
        "IIM also has publicly listed offices in Abuja and Lagos, Nigeria.",
    },

    {
      id: "iim_core_activities",
      title: "IIM Core Activities",
      category: "About IIM",
      source: "IIM Africa website — About IIM",
      sourceUrl: "https://iim-africa.org/ng/about-iim/",
      verified: true,
      keywords: [
        "activities",
        "services",
        "what does iim offer",
        "research",
        "study materials",
        "journals",
        "seminars",
        "workshops",
        "conferences",
        "training",
        "retraining",
        "certification",
        "capacity building",
      ],
      text:
        "IIM's core activities include promoting information management research, publishing study " +
        "materials and professional journals, organising seminars, workshops and conferences, " +
        "providing professional training and re-training, conducting certification activities and " +
        "supporting capacity building. Its professional subject areas include records, information, " +
        "data, archives, security and document management.",
    },

    /*
     * ============================================================
     * CERTIFICATION
     * ============================================================
     */

    {
      id: "professional_certifications",
      title: "Professional Certifications",
      category: "Certification",
      source: "IIM Africa website and client information request",
      sourceUrl: "https://iim-africa.org/ng/",
      verified: true,
      keywords: [
        "certification",
        "certifications",
        "certificate",
        "certificates",
        "professional certification",
        "what certification does iim offer",
        "what certifications does iim offer",
        "cdpo",
        "cim",
      ],
      text:
        "The professional certification that is clearly confirmed in the currently approved public " +
        "website data is the IIM Certified Data Protection Officer certification, known as CDPO. " +
        "The project information also refers to a Certified Information Manager certification, known " +
        "as CIM, but complete and current CIM details were not found in the verified public website " +
        "material. CIM availability, eligibility, syllabus, fees and certification status must " +
        "therefore be confirmed directly with IIM before the chatbot presents them as official facts.",
    },

    {
      id: "cdpo_overview",
      title: "CDPO Certification",
      category: "Certification",
      source: "IIM Africa website — CDPO and certification FAQs",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "cdpo",
        "cdpo certification",
        "certified data protection officer",
        "data protection officer",
        "data protection certification",
        "privacy certification",
        "tell me about cdpo",
        "what is cdpo",
        "who is cdpo for",
        "suitable for cdpo",
      ],
      text:
        "Certified Data Protection Officer, or CDPO, is an IIM professional certification relating to " +
        "data protection practice. IIM is licensed by the Nigeria Data Protection Commission under " +
        "the Nigeria Data Protection Act 2023 to conduct examinations and certify data protection " +
        "professionals. The certification is relevant to work involving data protection, privacy, " +
        "information governance, cybersecurity and information management. The verified knowledge " +
        "base does not currently include the complete initial application process, examination " +
        "format, course schedule, examination fee or initial eligibility criteria. Those details " +
        "should be confirmed through IIM's Certification Department at certification@iim-africa.org.",
    },

    {
      id: "cdpo_professional_relevance",
      title: "CDPO Professional Relevance",
      category: "Certification",
      source: "IIM Africa website — Certification and CPD information",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "who should take cdpo",
        "who is cdpo suitable for",
        "cdpo audience",
        "privacy professional",
        "data protection professional",
        "compliance professional",
        "information security",
        "cybersecurity",
        "information governance",
        "career",
        "professional competence",
      ],
      text:
        "Based on the professional fields recognised in IIM's certification and continuing professional " +
        "development information, CDPO is particularly relevant to people working in data protection, " +
        "privacy, governance, cybersecurity and information management. The certification establishes " +
        "a formal professional credential in data protection. The approved source does not provide a " +
        "complete official list of job titles or guarantee employment, promotion or salary outcomes. " +
        "The chatbot should describe professional relevance without making unverified career guarantees.",
    },

    {
      id: "cdpo_validity",
      title: "CDPO Certificate Validity",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "cdpo validity",
        "certificate validity",
        "how long is cdpo valid",
        "how long does cdpo last",
        "certificate duration",
        "valid for",
        "expiry",
        "expiration",
        "expire",
        "one year",
      ],
      text:
        "An IIM CDPO certificate is valid for one year from its date of issuance. The expiry date is " +
        "calculated as exactly one year from the issue date. For example, a certificate issued on " +
        "3 March 2025 expires on 2 March 2026. Certificate holders are advised to begin the renewal " +
        "process at least one month before the expiry date.",
    },

    {
      id: "cdpo_renewal_overview",
      title: "CDPO Renewal Process",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "renew cdpo",
        "cdpo renewal",
        "renew certificate",
        "certificate renewal",
        "how do i renew",
        "how to renew",
        "renewal process",
        "renew my certification",
      ],
      text:
        "To begin renewing an IIM CDPO certificate, the certificate holder should contact the IIM " +
        "Certification Department at certification@iim-africa.org. The renewal request should include " +
        "the holder's full name, certificate number, certificate issue date and a clear request for " +
        "renewal. Renewal should normally begin at least one month before the certificate expires. " +
        "Re-examination is not required when the certificate remains valid and the holder satisfies " +
        "the CPD and maintenance-fee conditions.",
    },

    {
      id: "cdpo_renewal_requirements",
      title: "CDPO Renewal Requirements",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "renewal requirements",
        "requirements to renew",
        "cdpo renewal requirements",
        "what do i need to renew",
        "renew certification requirements",
        "renew certificate requirements",
        "maintenance",
        "cpd evidence",
      ],
      text:
        "The verified renewal requirements for an IIM CDPO certificate are: the certification must " +
        "not already have expired; the holder must provide evidence of qualifying continuing " +
        "professional development completed during the certification year; the holder must achieve " +
        "at least 20 CPD points during the year; and the annual certification maintenance fee must " +
        "be paid. When these requirements are satisfied before expiry, renewal does not require " +
        "re-examination.",
    },

    {
      id: "cdpo_cpd_points",
      title: "CDPO Continuing Professional Development Points",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "cpd",
        "cpd points",
        "continuing professional development",
        "how many cpd points",
        "minimum cpd",
        "20 cpd",
        "renewal points",
        "professional development points",
      ],
      text:
        "A CDPO certificate holder needs a minimum of 20 continuing professional development points " +
        "during each certification year to meet the standard renewal requirement. Evidence of the " +
        "completed professional development activities should be retained and provided as part of " +
        "the renewal process when requested.",
    },

    {
      id: "cdpo_cpd_activities",
      title: "Activities That Qualify for CDPO CPD",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "cpd activities",
        "what counts as cpd",
        "qualifying cpd",
        "earn cpd points",
        "webinars",
        "workshops",
        "conferences",
        "seminars",
        "training courses",
        "publishing",
        "speaking",
        "committees",
      ],
      text:
        "Activities that may qualify toward the CDPO continuing professional development requirement " +
        "include IIM or Nigeria Data Protection Commission organised or approved webinars and " +
        "workshops; conferences and seminars relating to data protection, privacy, governance, " +
        "cybersecurity or information management; relevant professional training and short courses; " +
        "publishing articles, academic papers or research in the field; speaking or facilitating at " +
        "professional events; and active participation in IIM committees, projects or technical " +
        "working groups.",
    },

    {
      id: "cdpo_cpd_shortfall",
      title: "CDPO CPD Shortfall",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "not enough cpd",
        "cpd shortfall",
        "miss cpd",
        "do not meet cpd",
        "don't meet cpd",
        "failed cpd",
        "less than 20 points",
        "cannot renew",
      ],
      text:
        "When a CDPO certificate holder does not meet the required CPD points, the certificate cannot " +
        "be renewed until the CPD shortfall has been completed. If the certificate lapses while the " +
        "requirements remain incomplete, additional reinstatement procedures may apply. The holder " +
        "should contact certification@iim-africa.org for instructions relating to the individual case.",
    },

    {
      id: "cdpo_expired_certificate",
      title: "Expired CDPO Certificate",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "expired cdpo",
        "certificate expired",
        "certification expired",
        "missed renewal",
        "renew after expiry",
        "expired before renewal",
        "re-examination",
        "reexamination",
        "lapsed certificate",
      ],
      text:
        "The normal renewal process applies only while the CDPO certificate has not expired. When a " +
        "certificate expires before renewal is completed, re-examination is required according to " +
        "the verified public FAQ information. A lapsed certificate may also be subject to a " +
        "reinstatement process. The certificate holder should contact the Certification Department " +
        "at certification@iim-africa.org for official instructions.",
    },

    {
      id: "cdpo_renewal_fee",
      title: "CDPO Certification Maintenance Fee",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "renewal fee",
        "cdpo renewal fee",
        "certificate renewal cost",
        "renewal cost",
        "maintenance fee",
        "certification maintenance fee",
        "how much to renew",
        "price to renew",
      ],
      text:
        "Payment of an annual certification maintenance fee is one of the requirements for CDPO " +
        "renewal. The verified public source confirms that the fee is required but does not provide " +
        "the current amount. Accredited IIM members may receive preferential renewal fees. For the " +
        "latest fee, payment instructions and applicable member rate, contact " +
        "certification@iim-africa.org.",
    },

    {
      id: "member_vs_nonmember_cdpo",
      title: "IIM Member and Non-Member CDPO Holders",
      category: "Certification",
      source: "IIM Africa website — Frequently Asked Questions",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "member vs non-member",
        "member and non member",
        "accredited member",
        "non-member certificate holder",
        "cdpo member",
        "cdpo non member",
        "difference between member and nonmember",
        "preferential renewal fee",
      ],
      text:
        "An IIM Accredited Member has formally applied for and been admitted into IIM's membership " +
        "structure. A non-member CDPO holder has the professional credential but is not enrolled in " +
        "the institute's membership framework. Accredited Members receive access to the membership " +
        "structure, governance participation, structured CPD opportunities and preferential " +
        "certification renewal fees. A non-member may hold the CDPO certificate without receiving " +
        "the full membership rights and benefits.",
    },

    {
      id: "cim_status",
      title: "CIM Certification Status Requiring Confirmation",
      category: "Certification",
      source: "IIM project information request",
      sourceUrl: "",
      verified: false,
      keywords: [
        "cim",
        "cim certification",
        "certified information manager",
        "information manager certification",
        "tell me about cim",
        "cim eligibility",
        "cim fee",
      ],
      text:
        "The project material refers to a Certified Information Manager certification, abbreviated " +
        "as CIM. However, complete current CIM information was not found in the verified public " +
        "website extraction. The chatbot must not invent its syllabus, fees, eligibility, duration, " +
        "assessment method or renewal conditions. CIM information should be confirmed with an " +
        "authorised IIM representative before it is presented as official.",
    },

    /*
     * ============================================================
     * MEMBERSHIP
     * ============================================================
     */

    {
      id: "membership_overview",
      title: "IIM Membership Overview",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "membership",
        "join iim",
        "become a member",
        "who can join",
        "membership types",
        "membership categories",
        "student membership",
        "individual membership",
        "corporate membership",
      ],
      text:
        "IIM provides Student Membership, Individual Membership and Corporate Membership. Student " +
        "Membership is intended for full-time students enrolled in information management or a " +
        "related course at a recognised institution. Individual Membership is for professionals in " +
        "information management or related disciplines. Corporate Membership is for businesses and " +
        "organisations whose activities align with IIM's objectives. All membership applications " +
        "require approval by the IIM Executive Council.",
    },

    {
      id: "student_membership",
      title: "Student Membership — STIIM",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "student membership",
        "student member",
        "stiim",
        "can students join",
        "student requirements",
        "student eligibility",
        "student membership cost",
        "full-time student",
      ],
      text:
        "Student Membership, with the designation STIIM, is available to a full-time student enrolled " +
        "in information management or a related course at a recognised institution. The applicant " +
        "must provide proof of active student status. Student members may be upgraded automatically " +
        "after graduation or may progress through an upgrade examination. Full-time Student Members " +
        "are exempt from the general 100 US dollar membership registration fee. The published annual " +
        "subscription for a Full-time Student Member is 50 US dollars.",
    },

    {
      id: "graduate_membership",
      title: "Graduate Membership — GMIIM",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "graduate membership",
        "graduate member",
        "gmiim",
        "graduate requirements",
        "graduate eligibility",
        "pre-induction training",
        "graduate membership fee",
      ],
      text:
        "Graduate Membership uses the designation GMIIM. The applicant must provide proof of " +
        "graduation and complete IIM's pre-induction training before induction. Graduate Members are " +
        "exempt from the standard 100 US dollar registration fee because the pre-induction training " +
        "and examination process applies instead. The published one-time induction fee is 60 US " +
        "dollars, and the annual subscription is 100 US dollars.",
    },

    {
      id: "associate_membership",
      title: "Associate Membership — AMIIM",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "associate membership",
        "associate member",
        "amiim",
        "associate requirements",
        "associate eligibility",
        "associate membership fee",
        "ond",
        "upgrade exam",
      ],
      text:
        "Associate Membership uses the designation AMIIM. A person may qualify by being a graduate " +
        "of at least two years' standing, by holding a minimum OND qualification, or by passing the " +
        "relevant upgrade examination. The published registration fee is 100 US dollars, the " +
        "one-time induction fee is 66 US dollars and the annual subscription is 110 US dollars. " +
        "Applications remain subject to approval by the IIM Executive Council.",
    },

    {
      id: "professional_membership",
      title: "Professional Membership — PMIIM",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "professional membership",
        "professional member",
        "pmiim",
        "professional requirements",
        "professional eligibility",
        "professional membership fee",
        "five years experience",
        "master certification",
      ],
      text:
        "Professional Membership uses the designation PMIIM. The published qualification routes " +
        "include holding a degree, HND or OND; having five years of post-graduation experience; or " +
        "holding an IIM Professional or Master Certification. The published registration fee is " +
        "100 US dollars, the one-time induction fee is 99 US dollars and the annual subscription is " +
        "180 US dollars. Final admission requires Executive Council approval.",
    },

    {
      id: "senior_professional_membership",
      title: "Senior Professional Membership — SPMIIM",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "senior professional membership",
        "senior professional member",
        "spmiim",
        "senior membership requirements",
        "senior professional eligibility",
        "direct reports",
        "ten years experience",
        "senior membership fee",
      ],
      text:
        "Senior Professional Membership uses the designation SPMIIM. The applicant must have " +
        "supervised at least five direct reports. The listed qualification routes also include a " +
        "degree or HND, ten years of post-graduation experience, or an IIM Professional or Master " +
        "Certification. The published registration fee is 100 US dollars, the one-time induction " +
        "fee is 134 US dollars and the annual subscription is 200 US dollars.",
    },

    {
      id: "fellow_membership",
      title: "Fellow Membership — FIIM",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "fellow",
        "fellow membership",
        "fiim",
        "become a fellow",
        "fellow requirements",
        "fellow eligibility",
        "fifteen years experience",
        "15 years",
        "nomination",
        "fellow fee",
      ],
      text:
        "Fellow Membership uses the designation FIIM and is awarded for professional eminence, " +
        "authority or seniority. The website indicates that a Fellow would typically have at least " +
        "15 years of information management or information technology experience. The candidate " +
        "must be nominated by two existing Fellows and approved by the Membership Committee and " +
        "Executive Council. The published registration fee is 100 US dollars, the one-time " +
        "induction fee is 173 US dollars and the annual subscription is 242 US dollars.",
    },

    {
      id: "corporate_membership",
      title: "Corporate Membership — CORMIIM",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "corporate membership",
        "company membership",
        "organisation membership",
        "organization membership",
        "cormiim",
        "business membership",
        "corporate requirements",
        "company join iim",
        "corporate fee",
      ],
      text:
        "Corporate Membership uses the designation CORMIIM. The organisation must employ at least " +
        "five people and must have two supporters for its application, ideally including an existing " +
        "IIM Fellow. Corporate membership applications can be directed to membership@iim-africa.org. " +
        "The published registration fee is 100 US dollars, the one-time induction fee is 237 US " +
        "dollars and the annual subscription is 245 US dollars.",
    },

    {
      id: "membership_fees",
      title: "IIM Membership Fees",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      keywords: [
        "membership fees",
        "membership fee",
        "membership cost",
        "how much is membership",
        "how much does membership cost",
        "registration fee",
        "induction fee",
        "annual subscription",
        "subscription cost",
        "membership prices",
      ],
      text:
        "The general membership registration fee is 100 US dollars. Student and Graduate Members " +
        "are exempt from that registration fee because their relevant student or pre-induction " +
        "process applies. Published one-time induction fees are: Graduate Member 60 US dollars, " +
        "Associate Member 66 US dollars, Professional Member 99 US dollars, Senior Professional " +
        "Member 134 US dollars, Fellow Member 173 US dollars and Corporate Member 237 US dollars. " +
        "Published annual subscriptions are: Full-time Student Member 50 US dollars, Graduate Member " +
        "100 US dollars, Associate Member 110 US dollars, Professional Member 180 US dollars, Senior " +
        "Professional Member 200 US dollars, Fellow Member 242 US dollars and Corporate Member " +
        "245 US dollars. The source states that all payments are non-refundable.",
    },

    {
      id: "membership_payment",
      title: "Membership Payment Information",
      category: "Membership",
      source: "IIM Africa website — Membership Grades",
      sourceUrl: "https://iim-africa.org/ng/grades/",
      verified: true,
      sensitive: true,
      keywords: [
        "pay membership",
        "membership payment",
        "how do i pay",
        "bank payment",
        "bank account",
        "gtbank",
        "payment details",
        "membership bank details",
        "nigeria payment",
      ],
      text:
        "The published Nigeria bank-payment information names the beneficiary as Institute of " +
        "Information Management and identifies GTBank, Ajah/Lagos branch. Because bank details may " +
        "change and payment fraud is possible, the chatbot should not encourage immediate payment " +
        "using stored bank details. It should direct the user to confirm the latest official payment " +
        "instructions with membership@iim-africa.org before transferring money. The public source " +
        "also states that payments are non-refundable.",
    },

    {
      id: "membership_benefits",
      title: "IIM Membership Benefits",
      category: "Membership",
      source: "IIM Africa website — Membership Benefits",
      sourceUrl: "https://iim-africa.org/ng/benefits/",
      verified: true,
      keywords: [
        "membership benefits",
        "benefits of membership",
        "why join iim",
        "member advantages",
        "member rights",
        "member resources",
        "voting rights",
        "meetings",
        "priority seminars",
      ],
      text:
        "Published IIM membership benefits include participation in regular, general and special " +
        "meetings; receiving notices of meetings and programme summaries; eligibility for election " +
        "to the Executive; nomination and voting rights; the right to recommend and vote on " +
        "constitutional amendments; priority consideration for seminars, conferences and workshops; " +
        "and access to IIM information resources. Particular rights may depend on the person's " +
        "membership status and applicable governance rules.",
    },

    /*
     * ============================================================
     * CONTACT AND SUPPORT
     * ============================================================
     */

    {
      id: "general_contact",
      title: "IIM General Contact Information",
      category: "Contact and Support",
      source: "IIM Africa website footer and FAQs",
      sourceUrl: "https://iim-africa.org/ng/",
      verified: true,
      keywords: [
        "contact iim",
        "how do i contact iim",
        "contact details",
        "email",
        "general enquiries",
        "phone",
        "telephone",
        "call iim",
        "help",
        "support",
        "speak to someone",
        "talk to a human",
      ],
      text:
        "For general enquiries, contact IIM at info@iim-africa.org. The published Nigeria telephone " +
        "numbers are +234 7058 000405, +234 812 3695 594 and +234 813 6021 453. The official website " +
        "is www.iim-africa.org. Questions requiring an official decision, individual assessment or " +
        "information not contained in the chatbot knowledge base should be referred to an authorised " +
        "IIM staff member.",
    },

    {
      id: "department_contacts",
      title: "IIM Department Contact Details",
      category: "Contact and Support",
      source: "IIM Africa website footer and FAQs",
      sourceUrl: "https://iim-africa.org/ng/frequently-asked-questions/",
      verified: true,
      keywords: [
        "certification email",
        "certification department",
        "membership email",
        "membership department",
        "renewal contact",
        "membership contact",
        "department contact",
        "who do i email",
      ],
      text:
        "Certification, CDPO renewal and continuing professional development enquiries should be " +
        "directed to certification@iim-africa.org. Membership applications, membership grades, " +
        "corporate membership and membership payment enquiries should be directed to " +
        "membership@iim-africa.org. General enquiries may be sent to info@iim-africa.org.",
    },

    {
      id: "office_locations",
      title: "IIM Abuja and Lagos Offices",
      category: "Contact and Support",
      source: "IIM Africa website footer",
      sourceUrl: "https://iim-africa.org/ng/",
      verified: true,
      keywords: [
        "office",
        "offices",
        "office location",
        "where are the offices",
        "abuja office",
        "lagos office",
        "abuja address",
        "lagos address",
        "address",
        "visit iim",
      ],
      text:
        "IIM's published Abuja office address is: 3rd Floor, Upper Grace Plaza, Plot 217 Shettima " +
        "Munguno Crescent, behind Julius Berger Yard, Utako, Abuja, Nigeria. Its published Lagos " +
        "office address is: 13 Association Avenue, Ilupeju, Lagos, Nigeria. Users planning a visit " +
        "should contact IIM first to confirm opening arrangements and appointment requirements.",
    },

    {
      id: "social_media",
      title: "IIM Social Media",
      category: "Contact and Support",
      source: "IIM Africa website footer",
      sourceUrl: "https://iim-africa.org/ng/",
      verified: true,
      keywords: [
        "social media",
        "facebook",
        "twitter",
        "x",
        "linkedin",
        "instagram",
        "youtube",
        "iimafrica",
        "social accounts",
        "follow iim",
      ],
      text:
        "IIM lists official social-media presences on Facebook, Twitter or X, LinkedIn, Instagram and " +
        "YouTube. The published account name is @IIMAFRICA. Users should verify that an account is " +
        "official before sharing personal information or acting on payment instructions.",
    },

    {
      id: "human_escalation",
      title: "Human Support and Escalation",
      category: "Contact and Support",
      source: "IIM chatbot governance rule",
      sourceUrl: "https://iim-africa.org/ng/",
      verified: true,
      keywords: [
        "human",
        "agent",
        "staff",
        "representative",
        "talk to a human",
        "speak to someone",
        "not answered",
        "more help",
        "official confirmation",
        "complaint",
        "individual case",
      ],
      text:
        "The chatbot should refer a user to an authorised IIM staff member when the approved knowledge " +
        "base does not contain the requested information, when an individual application or " +
        "certification decision is required, when a complaint or dispute is involved, or when the " +
        "question concerns legal advice, privacy-sensitive information or official payment " +
        "instructions. General enquiries should go to info@iim-africa.org, certification matters to " +
        "certification@iim-africa.org and membership matters to membership@iim-africa.org.",
    },

    /*
     * ============================================================
     * MISSING OR UNCONFIRMED INFORMATION
     * ============================================================
     */

    {
      id: "unconfirmed_information",
      title: "Information Requiring Client Confirmation",
      category: "Governance",
      source: "IIM website data gap analysis",
      sourceUrl: "",
      verified: true,
      keywords: [
        "training date",
        "training dates",
        "training calendar",
        "class dates",
        "training fee",
        "course fee",
        "course price",
        "full faq",
        "chatbot privacy",
        "hosting",
        "website platform",
        "wordpress",
        "cim details",
      ],
      text:
        "The approved project data does not currently confirm a complete training calendar, class " +
        "dates, training prices, a complete official FAQ export, detailed and current CIM " +
        "certification information, the final website platform and chatbot integration process, " +
        "the client's preferred escalation workflow, final chatbot branding, the answer sign-off " +
        "process, hosting preference or complete chatbot data-privacy requirements. The chatbot " +
        "must not invent this information and should refer the user to IIM.",
    },

    {
      id: "unsupported_legal_advice",
      title: "Legal and Compliance Advice Limitation",
      category: "Governance",
      source: "IIM chatbot governance rule",
      sourceUrl: "",
      verified: true,
      keywords: [
        "legal advice",
        "law",
        "legal opinion",
        "compliance advice",
        "am i compliant",
        "is this legal",
        "lawsuit",
        "court",
        "regulatory decision",
        "official decision",
      ],
      text:
        "The IIM chatbot provides general published information only. It must not provide legal " +
        "advice, make formal compliance determinations or decide how a law applies to an individual " +
        "or organisation. Legal, regulatory and case-specific compliance questions should be " +
        "referred to an appropriately authorised professional or IIM representative.",
    },

    {
      id: "privacy_and_sensitive_data",
      title: "Privacy and Sensitive Information",
      category: "Governance",
      source: "IIM chatbot governance rule",
      sourceUrl: "",
      verified: true,
      keywords: [
        "personal data",
        "personal information",
        "certificate number",
        "upload document",
        "passport",
        "identity document",
        "bank information",
        "confidential",
        "private",
        "sensitive",
      ],
      text:
        "Users should not submit passwords, banking credentials, identification documents, private " +
        "certificate records or other sensitive personal information to the prototype chatbot. " +
        "Individual records and confidential cases should be handled through an approved IIM " +
        "communication channel rather than through the public chatbot interface.",
    },
  ];

  /*
   * Common words that contribute little to retrieval.
   */
    /*
   * Improved browser-based RAG retrieval system.
   *
   * Features:
   * - synonym expansion
   * - typo tolerance
   * - lightweight stemming
   * - phrase matching
   * - category detection
   * - confidence scoring
   * - verified-source preference
   * - diversified results
   */

  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "but",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "please",
    "should",
    "tell",
    "that",
    "the",
    "their",
    "there",
    "this",
    "to",
    "us",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
    "you",
    "your",
    "about",
    "want",
    "need",
    "know",
    "give",
    "show",
  ]);

  /*
   * These words appear in many IIM documents.
   * They receive less weight because they are too general.
   */
  const broadTerms = new Set([
    "iim",
    "information",
    "management",
    "professional",
    "institute",
    "organisation",
    "organization",
    "official",
    "details",
    "requirements",
    "application",
    "service",
    "services",
    "program",
    "programme",
  ]);

  /*
   * Adds related words to a user's question.
   *
   * Example:
   * "How much does membership cost?"
   *
   * Expanded query:
   * "how much does membership cost fee fees price subscription"
   */
  const phraseAliases = {
    join: [
      "membership",
      "become a member",
      "membership application",
    ],

    "become member": [
      "membership",
      "join iim",
    ],

    price: [
      "fee",
      "fees",
      "cost",
      "subscription",
    ],

    cost: [
      "fee",
      "fees",
      "price",
      "subscription",
    ],

    pay: [
      "payment",
      "fee",
      "bank payment",
    ],

    renew: [
      "renewal",
      "maintenance",
      "certificate renewal",
    ],

    expire: [
      "expired",
      "expiry",
      "validity",
    ],

    expired: [
      "expiry",
      "renewal",
      "re-examination",
      "lapsed certificate",
    ],

    valid: [
      "validity",
      "duration",
      "expiry",
    ],

    course: [
      "training",
      "workshop",
      "programme",
    ],

    class: [
      "training",
      "course",
      "programme",
    ],

    conference: [
      "event",
      "seminar",
      "workshop",
    ],

    "talk to someone": [
      "human",
      "staff",
      "contact",
      "representative",
    ],

    "speak to someone": [
      "human",
      "staff",
      "contact",
      "representative",
    ],

    "talk to a person": [
      "human",
      "staff",
      "contact",
      "representative",
    ],

    "phone number": [
      "telephone",
      "contact",
      "call iim",
    ],

    "email address": [
      "email",
      "contact",
      "general enquiries",
    ],

    "data privacy": [
      "data protection",
      "privacy",
      "cdpo",
    ],

    dpo: [
      "cdpo",
      "data protection officer",
    ],

    "certified information manager": [
      "cim",
    ],

    "certified data protection officer": [
      "cdpo",
    ],

    student: [
      "student membership",
      "stiim",
    ],

    graduate: [
      "graduate membership",
      "gmiim",
    ],

    associate: [
      "associate membership",
      "amiim",
    ],

    fellow: [
      "fellow membership",
      "fiim",
    ],

    company: [
      "corporate",
      "organisation",
      "corporate membership",
    ],

    business: [
      "corporate",
      "organisation",
      "corporate membership",
    ],

    office: [
      "location",
      "address",
      "contact",
    ],

    legitimate: [
      "registered",
      "recognised",
      "approved",
      "licensed",
    ],

    career: [
      "professional relevance",
      "certification",
      "training",
    ],
  };

  /*
   * Category detection gives extra weight to documents belonging
   * to the most likely subject area.
   */
  const intentRules = [
    {
      category: "Certification",
      terms: [
        "certification",
        "certificate",
        "cdpo",
        "cim",
        "exam",
        "cpd",
        "renew",
        "renewal",
        "expiry",
        "expired",
      ],
    },

    {
      category: "Membership",
      terms: [
        "membership",
        "member",
        "join",
        "subscription",
        "induction",
        "stiim",
        "gmiim",
        "amiim",
        "pmiim",
        "spmiim",
        "fiim",
        "cormiim",
      ],
    },

    {
      category: "Contact and Support",
      terms: [
        "contact",
        "email",
        "phone",
        "call",
        "human",
        "staff",
        "office",
        "address",
        "complaint",
      ],
    },

    {
      category: "About IIM",
      terms: [
        "about",
        "mission",
        "headquarters",
        "location",
        "legitimate",
        "registered",
        "recognised",
        "recognized",
        "activities",
      ],
    },

    {
      category: "Governance",
      terms: [
        "legal",
        "privacy",
        "sensitive",
        "personal data",
        "compliant",
        "compliance",
        "law",
      ],
    },
  ];

  /**
   * Normalises text for matching.
   */
  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[®™©]/g, "")
      .replace(/\bwhat's\b/g, "what is")
      .replace(/\bwho's\b/g, "who is")
      .replace(/\bcan't\b/g, "cannot")
      .replace(/\bdon't\b/g, "do not")
      .replace(/\bdoesn't\b/g, "does not")
      .replace(/\bi'm\b/g, "i am")
      .replace(/\bthey're\b/g, "they are")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Performs lightweight stemming.
   *
   * Examples:
   * memberships -> membership
   * expired -> expir
   * training -> train
   */
  function stem(token) {
    let value = token;

    if (
      value.length > 5 &&
      value.endsWith("ies")
    ) {
      value = value.slice(0, -3) + "y";
    } else if (
      value.length > 5 &&
      value.endsWith("ing")
    ) {
      value = value.slice(0, -3);
    } else if (
      value.length > 4 &&
      value.endsWith("ed")
    ) {
      value = value.slice(0, -2);
    } else if (
      value.length > 4 &&
      value.endsWith("es")
    ) {
      value = value.slice(0, -2);
    } else if (
      value.length > 3 &&
      value.endsWith("s")
    ) {
      value = value.slice(0, -1);
    }

    return value;
  }

  /**
   * Calculates the edit distance between two words.
   * This allows matching small spelling mistakes.
   */
  function editDistance(firstWord, secondWord) {
    if (firstWord === secondWord) {
      return 0;
    }

    if (!firstWord.length) {
      return secondWord.length;
    }

    if (!secondWord.length) {
      return firstWord.length;
    }

    const previous = Array.from(
      {
        length: secondWord.length + 1,
      },
      (_, index) => index
    );

    const current = new Array(
      secondWord.length + 1
    );

    for (
      let firstIndex = 1;
      firstIndex <= firstWord.length;
      firstIndex++
    ) {
      current[0] = firstIndex;

      for (
        let secondIndex = 1;
        secondIndex <= secondWord.length;
        secondIndex++
      ) {
        const substitutionCost =
          firstWord[firstIndex - 1] ===
          secondWord[secondIndex - 1]
            ? 0
            : 1;

        current[secondIndex] = Math.min(
          current[secondIndex - 1] + 1,
          previous[secondIndex] + 1,
          previous[secondIndex - 1] +
            substitutionCost
        );
      }

      for (
        let secondIndex = 0;
        secondIndex <= secondWord.length;
        secondIndex++
      ) {
        previous[secondIndex] =
          current[secondIndex];
      }
    }

    return previous[secondWord.length];
  }

  /**
   * Returns a similarity value between 0 and 1.
   */
  function tokenSimilarity(firstToken, secondToken) {
    if (firstToken === secondToken) {
      return 1;
    }

    if (
      firstToken.length < 4 ||
      secondToken.length < 4
    ) {
      return 0;
    }

    const distance = editDistance(
      firstToken,
      secondToken
    );

    const longestLength = Math.max(
      firstToken.length,
      secondToken.length
    );

    return 1 - distance / longestLength;
  }

  /**
   * Converts text into useful searchable tokens.
   */
  function getTokens(text) {
    return normalize(text)
      .split(" ")
      .filter(Boolean)
      .filter((token) => token.length > 1)
      .filter((token) => !stopWords.has(token))
      .map(stem);
  }

  /**
   * Expands the user's question using related words.
   */
  function expandQuery(query) {
    const normalizedQuery = normalize(query);
    const additions = [];

    for (
      const [phrase, aliases]
      of Object.entries(phraseAliases)
    ) {
      if (normalizedQuery.includes(phrase)) {
        additions.push(...aliases);
      }
    }

    return normalize(
      [
        normalizedQuery,
        ...additions,
      ].join(" ")
    );
  }

  /**
   * Detects the likely question category.
   */
  function detectCategoryBoosts(query) {
    const normalizedQuery = normalize(query);
    const boosts = new Map();

    for (const rule of intentRules) {
      const matchingTerms = rule.terms.filter(
        (term) =>
          normalizedQuery.includes(
            normalize(term)
          )
      );

      if (matchingTerms.length > 0) {
        boosts.set(
          rule.category,
          7 + matchingTerms.length * 3
        );
      }
    }

    return boosts;
  }

  /**
   * Counts how often a word appears in text.
   */
  function countOccurrences(text, searchTerm) {
    if (!text || !searchTerm) {
      return 0;
    }

    let count = 0;
    let position = 0;

    while (true) {
      position = text.indexOf(
        searchTerm,
        position
      );

      if (position === -1) {
        break;
      }

      count += 1;
      position += searchTerm.length;
    }

    return count;
  }

  /**
   * Finds the closest token match.
   */
  function fuzzyTokenMatch(
    queryToken,
    candidateTokens
  ) {
    let bestSimilarity = 0;

    for (const candidateToken of candidateTokens) {
      if (queryToken === candidateToken) {
        return 1;
      }

      const similarity = tokenSimilarity(
        queryToken,
        candidateToken
      );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
      }
    }

    return bestSimilarity;
  }

  /**
   * Scores one document against the user's question.
   */
  function scoreDocument(
    normalizedQuery,
    queryTokens,
    document,
    categoryBoosts
  ) {
    const normalizedTitle = normalize(
      document.title
    );

    const normalizedCategory = normalize(
      document.category
    );

    const normalizedText = normalize(
      document.text
    );

    const normalizedKeywords = (
      document.keywords || []
    ).map(normalize);

    const titleTokens = getTokens(
      normalizedTitle
    );

    const keywordTokens = getTokens(
      normalizedKeywords.join(" ")
    );

    const textTokens = getTokens(
      normalizedText
    );

    const allDocumentTokens = [
      ...new Set([
        ...titleTokens,
        ...keywordTokens,
        ...textTokens,
      ]),
    ];

    let score = 0;
    let exactMeaningfulMatches = 0;
    let fuzzyMatches = 0;

    const matchedTerms = new Set();

    /*
     * Strong exact keyword and phrase matching.
     */
    for (
      const keyword
      of normalizedKeywords
    ) {
      if (!keyword) {
        continue;
      }

      if (normalizedQuery === keyword) {
        score += keyword.includes(" ")
          ? 42
          : 28;

        exactMeaningfulMatches += 1;
        matchedTerms.add(keyword);
      } else if (
        normalizedQuery.includes(keyword)
      ) {
        score += keyword.includes(" ")
          ? 24
          : 12;

        exactMeaningfulMatches += 1;
        matchedTerms.add(keyword);
      } else if (
        keyword.includes(normalizedQuery) &&
        normalizedQuery.length >= 4
      ) {
        score += 10;
      }
    }

    /*
     * Strong title matching.
     */
    if (
      normalizedQuery === normalizedTitle
    ) {
      score += 45;
    } else if (
      normalizedQuery.includes(
        normalizedTitle
      ) &&
      normalizedTitle.length > 4
    ) {
      score += 24;
    }

    /*
     * Add a category-based score.
     */
    const categoryBoost =
      categoryBoosts.get(
        document.category
      ) || 0;

    score += categoryBoost;

    /*
     * Match individual words.
     */
    for (const token of queryTokens) {
      const isBroadTerm =
        broadTerms.has(token);

      let matched = false;

      if (titleTokens.includes(token)) {
        score += isBroadTerm ? 2 : 9;
        matched = true;
      }

      if (keywordTokens.includes(token)) {
        score += isBroadTerm ? 2 : 8;
        matched = true;
      }

      const textOccurrences =
        countOccurrences(
          normalizedText,
          token
        );

      if (textOccurrences > 0) {
        score += isBroadTerm
          ? Math.min(textOccurrences, 2)
          : Math.min(
              textOccurrences,
              4
            ) * 2.5;

        matched = true;
      }

      if (matched) {
        if (!isBroadTerm) {
          exactMeaningfulMatches += 1;
        }

        matchedTerms.add(token);
      } else if (
        !isBroadTerm &&
        token.length >= 4
      ) {
        /*
         * Try a spelling-tolerant match.
         */
        const similarity =
          fuzzyTokenMatch(
            token,
            allDocumentTokens
          );

        if (similarity >= 0.82) {
          score += similarity >= 0.9
            ? 5
            : 3;

          fuzzyMatches += 1;
          matchedTerms.add(token);
        }
      }
    }

    const uniqueMeaningfulMatches = [
      ...matchedTerms,
    ].filter(
      (term) =>
        !broadTerms.has(term) &&
        !stopWords.has(term)
    ).length;

    /*
     * Reward documents matching several important terms.
     */
    if (uniqueMeaningfulMatches >= 2) {
      score +=
        uniqueMeaningfulMatches * 5;
    }

    if (uniqueMeaningfulMatches >= 3) {
      score += 10;
    }

    if (uniqueMeaningfulMatches >= 4) {
      score += 8;
    }

    /*
     * Reject documents matched only by generic words.
     */
    if (
      exactMeaningfulMatches === 0 &&
      fuzzyMatches === 0
    ) {
      return 0;
    }

    /*
     * Reduce weak results when a longer question
     * matches only one useful term.
     */
    if (
      queryTokens.length >= 2 &&
      uniqueMeaningfulMatches === 1
    ) {
      score *= 0.62;
    }

    /*
     * Prefer verified knowledge.
     */
    if (!document.verified) {
      score *= 0.82;
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Produces a confidence value between 0 and 1.
   */
  function calculateConfidence(
    topScore,
    secondScore,
    queryTokenCount
  ) {
    if (topScore <= 0) {
      return 0;
    }

    const absoluteConfidence =
      Math.min(topScore / 55, 1);

    const scoreMargin =
      secondScore > 0
        ? Math.min(
            (
              topScore - secondScore
            ) /
              Math.max(topScore, 1),
            1
          )
        : 1;

    const queryFactor = Math.min(
      Math.max(queryTokenCount, 1) / 3,
      1
    );

    return Math.max(
      0,
      Math.min(
        1,
        absoluteConfidence * 0.65 +
          scoreMargin * 0.25 +
          queryFactor * 0.1
      )
    );
  }

  /**
   * Prevents all selected results from being nearly identical.
   */
  function diversify(results, limit) {
    const selectedResults = [];
    const categoryCounts = new Map();

    for (const result of results) {
      const currentCount =
        categoryCounts.get(
          result.category
        ) || 0;

      if (currentCount >= 3) {
        continue;
      }

      selectedResults.push(result);

      categoryCounts.set(
        result.category,
        currentCount + 1
      );

      if (
        selectedResults.length >= limit
      ) {
        break;
      }
    }

    return selectedResults;
  }

  /**
   * Main retrieval function.
   *
   * This keeps compatibility with:
   *
   * window.IIM_RAG.retrieve(userText, 4)
   */
  function retrieve(query, k) {
    const limit =
      Number.isInteger(k) && k > 0
        ? k
        : 4;

    const expandedQuery =
      expandQuery(query);

    if (!expandedQuery) {
      return [];
    }

    const queryTokens = [
      ...new Set(
        getTokens(expandedQuery)
      ),
    ];

    if (!queryTokens.length) {
      return [];
    }

    const categoryBoosts =
      detectCategoryBoosts(
        expandedQuery
      );

    const rankedDocuments = corpus
      .map((document) => ({
        ...document,

        score: scoreDocument(
          expandedQuery,
          queryTokens,
          document,
          categoryBoosts
        ),
      }))
      .filter(
        (document) =>
          document.score > 0
      )
      .sort((first, second) => {
        if (
          second.score !== first.score
        ) {
          return (
            second.score - first.score
          );
        }

        if (
          Number(second.verified) !==
          Number(first.verified)
        ) {
          return (
            Number(second.verified) -
            Number(first.verified)
          );
        }

        return first.title.localeCompare(
          second.title
        );
      });

    if (!rankedDocuments.length) {
      return [];
    }

    const topScore =
      rankedDocuments[0].score;

    const secondScore =
      rankedDocuments[1]
        ? rankedDocuments[1].score
        : 0;

    const confidence =
      calculateConfidence(
        topScore,
        secondScore,
        queryTokens.length
      );

    /*
     * Short queries need stronger evidence.
     */
    let minimumScore =
      queryTokens.length <= 1
        ? 11
        : 7;

    if (confidence < 0.28) {
      minimumScore += 3;
    }

    const acceptedDocuments =
      rankedDocuments
        .filter(
          (document) =>
            document.score >=
            minimumScore
        )
        .filter(
          (document) =>
            document.score >=
            topScore * 0.34
        )
        .map(
          (document, index) => ({
            ...document,

            rank: index + 1,

            confidence:
              index === 0
                ? confidence
                : Math.max(
                    0,
                    Math.min(
                      1,
                      confidence *
                        (
                          document.score /
                          topScore
                        )
                    )
                  ),
          })
        );

    return diversify(
      acceptedDocuments,
      limit
    );
  }

  /**
   * Returns retrieval results together with diagnostics.
   * This will be useful when testing your RAG.
   */
  function retrieveWithMeta(query, k) {
    const results = retrieve(query, k);

    return {
      query: query,

      normalizedQuery:
        expandQuery(query),

      results: results,

      topScore:
        results[0]
          ? results[0].score
          : 0,

      confidence:
        results[0]
          ? results[0].confidence
          : 0,

      hasReliableMatch: Boolean(
        results[0] &&
          results[0].confidence >= 0.34
      ),
    };
  }

  /**
   * Returns one document by its ID.
   */
  function getDocumentById(id) {
    return (
      corpus.find(
        (document) =>
          document.id === id
      ) || null
    );
  }

  /**
   * Returns documents belonging to one category.
   */
  function getDocumentsByCategory(
    category
  ) {
    const normalizedCategory =
      normalize(category);

    return corpus.filter(
      (document) =>
        normalize(
          document.category
        ) === normalizedCategory
    );
  }

  /**
   * Returns statistics about the knowledge base.
   */
  function getCorpusStats() {
    return {
      totalDocuments:
        corpus.length,

      verifiedDocuments:
        corpus.filter(
          (document) =>
            document.verified
        ).length,

      unverifiedDocuments:
        corpus.filter(
          (document) =>
            !document.verified
        ).length,

      categories: [
        ...new Set(
          corpus.map(
            (document) =>
              document.category
          )
        ),
      ],
    };
  }

  /*
   * Functions made available to app.js
   * and the browser console.
   */
  return {
    corpus,
    normalize,
    getTokens,
    expandQuery,
    retrieve,
    retrieveWithMeta,
    getDocumentById,
    getDocumentsByCategory,
    getCorpusStats,
  };
})();