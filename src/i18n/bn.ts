import type { Dict } from './en';

export const bn: Dict = {
  appTitle: 'টেন্ডার প্যাকেজ বিল্ডার',
  appTagline: 'সবকিছু এই কম্পিউটারেই থাকে। কিছুই আপলোড হয় না।',
  langLabel: 'ভাষা',
  steps: {
    label: 'অগ্রগতি',
    load: 'টেন্ডার খুলুন',
    files: 'ফাইল যোগ করুন',
    match: 'মিলান ও তারিখ',
    generate: 'তৈরি করুন',
  },
  load: {
    heading: 'টেন্ডারের চাহিদা-ফাইল দিয়ে শুরু করুন',
    body: 'টেন্ডারের সাথে পাওয়া requirements.json ফাইলটি খুলুন। কোন কোন কাগজ লাগবে তার তালিকা আমরা দেখাব।',
    button: 'requirements.json খুলুন',
    drop: 'অথবা ফাইলটি এখানে টেনে এনে ছাড়ুন',
    dropActive: 'খুলতে ফাইলটি ছেড়ে দিন',
    replace: 'অন্য একটি requirements.json খুলুন',
    notJsonFile: 'এটি .json ফাইল নয়। অনুগ্রহ করে requirements.json ফাইলটি বেছে নিন।',
    readFail: 'ফাইলটি পড়া যায়নি। আবার চেষ্টা করুন।',
    errorTitle: 'এই ফাইলটি খোলা যায়নি',
  },
  parseErrors: {
    notJson: 'ফাইলটি সঠিক JSON নয়। এটি নষ্ট হতে পারে বা ভুল ফাইল হতে পারে।',
    noTender: 'ফাইলে "tender" অংশটি নেই।',
    tenderField: (f) => `টেন্ডারের তথ্যে "${f}" নেই।`,
    badDeadline: 'জমার শেষ তারিখ YYYY-MM-DD আকারে একটি সঠিক তারিখ হতে হবে।',
    noRequirements: 'ফাইলে প্রয়োজনীয় কাগজের কোনো তালিকা নেই।',
    reqField: (i, f) => `${toBnDigits(i + 1)} নম্বর চাহিদায় "${f}" নেই বা ভুল।`,
    dupReqId: (id) => `দুটি চাহিদার একই আইডি "${id}"।`,
  },
  tender: {
    heading: 'টেন্ডারের তথ্য',
    id: 'টেন্ডার আইডি',
    title: 'শিরোনাম',
    entity: 'ক্রয়কারী প্রতিষ্ঠান',
    bidder: 'দরদাতা',
    deadline: 'জমার শেষ তারিখ',
  },
  checklist: {
    heading: 'প্রয়োজনীয় কাগজপত্র',
    count: (n) => `${toBnDigits(n)}টি কাগজ`,
    mandatory: 'বাধ্যতামূলক',
    optional: 'ঐচ্ছিক',
    hasExpiry: 'মেয়াদ শেষের তারিখ লাগবে',
  },
  files: {
    heading: 'আপনার ফাইল',
    emptyNoTender: 'প্রথমে চাহিদা-ফাইলটি খুলুন, তারপর এখানে আপনার PDF ফাইল যোগ করুন।',
  },
};

export function toBnDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}
