/*
 * IIM Chatbot — Knowledge Base, Intents, Personas, Journeys
 * Pure data module (global IIM_KB). No build step required.
 */
window.IIM_KB = (function () {
  const org = {
    name: "Institute of Information Management (IIM)",
    country: "Australia",
    city: "Greenbank",
    website: "http://www.iim-africa.org/au",
    email: "info@iim-africa.org",
    phone: "+61 451 109 163",
    contactPerson: "Dr. Ayodeji Oyedokun",
    disclaimer:
      "I'm IIM's AI assistant. I can guide you using published information, but I don't give legal or compliance advice. For official confirmation, please contact our team.",
  };

  const personas = [
    {
      id: "professional",
      label: "Professional (data / IT / compliance)",
      needs: "Certification pathways, CPD, exam booking, standards alignment.",
      starter: "I'm a data protection officer. Which certification fits me?",
    },
    {
      id: "student",
      label: "Student",
      needs: "Entry paths, affordability, career outcomes.",
      starter: "I'm a student. How do I start a career in information management?",
    },
    {
      id: "corporate",
      label: "Corporate client",
      needs: "Bulk training, sponsorship, procurement.",
      starter: "We want to train our team. Do you offer corporate programs?",
    },
    {
      id: "government",
      label: "Government / regulator",
      needs: "Standards, assurance, authority.",
      starter: "How does IIM certification support regulatory compliance?",
    },
    {
      id: "academic",
      label: "Academic partner",
      needs: "Curriculum alignment, MOUs.",
      starter: "Can our university align courses with IIM certification?",
    },
    {
      id: "ngo",
      label: "NGO stakeholder",
      needs: "Capacity building, grants, cost.",
      starter: "Do you support NGO capacity building?",
    },
  ];

  const suggestedTopics = [
    "Certifications overview",
    "CDPO certification",
    "CIM® certification",
    "How to get certified",
    "Membership",
    "Training programs",
    "Events & conferences",
    "Advisory services",
    "Talk to a human",
  ];

  const intents = [
    {
      id: "greeting",
      keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "help", "start"],
      threshold: 1,
      respond: () => ({
        text:
          "Hello! I'm the IIM AI assistant. I can help with certifications (CDPO, CIM®), " +
          "membership, training, events, and advisory services. What would you like to know?",
        quickReplies: suggestedTopics,
      }),
    },
    {
      id: "certification_overview",
      keywords: ["certification", "certificate", "certify", "credential", "qualification", "certifications overview"],
      threshold: 1,
      respond: () => ({
        text:
          "IIM offers professional certifications that build trusted expertise in data and " +
          "information management. Our flagship programs are:\n\n" +
          "• CDPO — Certified Data Protection Officer (privacy & data protection)\n" +
          "• CIM® — Certified Information Manager (information & records governance)\n\n" +
          "Which one would you like details on?",
        quickReplies: ["CDPO certification", "CIM® certification", "How to get certified"],
      }),
    },
    {
  id: "cdp_certification",
  keywords: [
    "cdpo",
    "certified data protection officer",
    "data protection officer",
    "data protection",
    "privacy",
    "dpo"
  ],
  threshold: 1,
  respond: () => ({
    text:
      "IIM offers the Certified Data Protection Officer, or CDPO, professional certification.\n\n" +
      "The approved project information does not currently provide detailed eligibility, syllabus, " +
      "examination, fee or renewal information. Please contact IIM for official program details.",
    quickReplies: [
      "Certifications overview",
      "Training programs",
      "Talk to a human"
    ],
  }),
},
    {
  id: "cim_certification",
  keywords: [
    "cim",
    "certified information manager",
    "information manager",
    "information management",
    "records management",
    "information governance"
  ],
  threshold: 1,
  respond: () => ({
    text:
      "IIM offers the Certified Information Manager, or CIM, professional certification.\n\n" +
      "The approved project information does not currently provide detailed eligibility, syllabus, " +
      "examination, fee or renewal information. Please contact IIM for official program details.",
    quickReplies: [
      "Certifications overview",
      "Training programs",
      "Talk to a human"
    ],
  }),
},
    {
  id: "how_to_certify",
  keywords: [
    "how to",
    "how do i",
    "requirements",
    "eligible",
    "eligibility",
    "apply",
    "get certified",
    "become certified",
    "steps",
    "process"
  ],
  threshold: 1,
  respond: () => ({
    text:
      "IIM offers professional certifications including CDPO and CIM.\n\n" +
      "The approved knowledge currently does not contain complete application steps, eligibility requirements, " +
      "exam conditions or fees. Please contact IIM staff for the official certification process.",
    quickReplies: [
      "CDPO certification",
      "CIM® certification",
      "Talk to a human"
    ],
  }),
},
    {
      id: "exam_info",
      keywords: ["exam", "test", "assessment", "fee", "fees", "cost", "price", "schedule", "book", "booking", "format"],
      threshold: 1,
      respond: () => ({
        text:
          "Certification exams are administered by IIM with scheduled sittings. Fees, formats, " +
          "and schedules are confirmed at booking.\n\n" +
          "For current exam fees, dates, and formats, our team will give you the exact, up-to-date " +
          "figures — pricing can change and I don't want to quote you incorrectly.",
        quickReplies: ["Talk to a human", "Training programs", "How to get certified"],
      }),
    },
    {
  id: "membership_info",
  keywords: [
    "membership",
    "member",
    "join",
    "subscription",
    "renew",
    "renewal",
    "affiliate",
    "affiliation"
  ],
  threshold: 1,
  respond: () => ({
    text:
      "IIM provides membership and professional affiliation programs.\n\n" +
      "Membership categories, benefits, eligibility, fees and renewal conditions are not included " +
      "in the approved chatbot knowledge. Please contact IIM for current official information.",
    quickReplies: [
      "Talk to a human",
      "Events & conferences",
      "Certifications overview"
    ],
  }),
},
    {
      id: "training_programs",
      keywords: ["training", "course", "courses", "workshop", "learn", "study", "program", "capacity"],
      threshold: 1,
      respond: () => ({
        text:
          "IIM delivers training and capacity-development programs aligned to its certifications, " +
          "including exam preparation, workshops, and corporate/group training.\n\n" +
          "We also support institutional and NGO capacity building. Tell me your context (individual, " +
          "team, or institution) and I'll point you to the right path.",
        quickReplies: ["Corporate client", "CDPO certification", "CIM® certification", "Talk to a human"],
      }),
    },
    {
  id: "events_conferences",
  keywords: [
    "event",
    "events",
    "conference",
    "conferences",
    "webinar",
    "summit",
    "workshop"
  ],
  threshold: 1,
  respond: () => ({
    text:
      "IIM provides conferences, workshops and global professional events.\n\n" +
      "The current event calendar, dates, locations, registration requirements and costs " +
      "must be confirmed with IIM staff.",
    quickReplies: [
      "Talk to a human",
      "Training programs",
      "Membership"
    ],
  }),
},
    {
      id: "advisory_services",
      keywords: ["advisory", "consult", "consulting", "policy", "strategy", "governance advice", "implementation"],
      threshold: 1,
      respond: () => ({
        text:
          "IIM provides policy advisory and consulting services to organisations building data and " +
          "information governance capability — from strategy to implementation.\n\n" +
          "We work with government, corporate, academic, and NGO partners. Share your challenge and " +
          "we'll route it to the right advisor.",
        quickReplies: ["Talk to a human", "Corporate client", "Government / regulator"],
      }),
    },
    {
      id: "professional_affiliation",
      keywords: ["affiliation", "professional affiliation", "designation", "post nominals", "title"],
      threshold: 1,
      respond: () => ({
        text:
          "Through certification and membership, professionals gain IIM affiliation and may use " +
          " recognised designations (e.g., CDPO, CIM®) that signal verified competence.\n\n" +
          "Affiliation supports career progression and organisational trust. Our team can explain " +
          "eligibility and post-nominal usage.",
        quickReplies: ["Membership", "Talk to a human", "How to get certified"],
      }),
    },
    {
      id: "contact_human",
      keywords: ["human", "agent", "person", "staff", "speak", "contact", "email", "call", "phone", "talk to"],
      threshold: 1,
      respond: () => ({
        text:
          "Happy to connect you with the IIM team.\n\n" +
          "📧 Email: " + org.email + "\n" +
          "📞 Phone: " + org.phone + "\n" +
          "🌐 Web: " + org.website + "\n\n" +
          "Your enquiry has been noted for follow-up. Is there anything else I can help with first?",
        quickReplies: suggestedTopics,
        escalate: true,
      }),
    },
    {
      id: "fallback",
      keywords: [],
      threshold: 0,
      respond: (input) => ({
        text:
          "I'm not certain I understood that. I can help with IIM certifications (CDPO, CIM®), " +
          "membership, training, events, and advisory services.\n\n" +
          "Could you pick a topic below, or I can connect you with a person?",
        quickReplies: suggestedTopics,
        escalate: false,
      }),
    },
  ];

  const journeys = [
    {
      persona: "professional",
      flow: ["greeting", "cdp_certification", "how_to_certify", "exam_info", "contact_human"],
    },
    {
      persona: "student",
      flow: ["greeting", "certification_overview", "cim_certification", "training_programs", "contact_human"],
    },
    {
      persona: "corporate",
      flow: ["greeting", "training_programs", "membership_info", "advisory_services", "contact_human"],
    },
    {
      persona: "government",
      flow: ["greeting", "certification_overview", "advisory_services", "contact_human"],
    },
  ];

  return { org, personas, suggestedTopics, intents, journeys };
})();
