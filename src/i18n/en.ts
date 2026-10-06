export const en = {
  appTitle: 'Tender Package Builder',
  appTagline: 'Everything stays on this computer. Nothing is uploaded.',
  langLabel: 'Language',
  steps: {
    label: 'Progress',
    load: 'Load tender',
    files: 'Add files',
    match: 'Match & dates',
    generate: 'Generate',
  },
  load: {
    heading: 'Start with the tender’s requirements file',
    body: 'Open the requirements.json file you received with the tender. We will show the list of documents you need.',
    button: 'Open requirements.json',
    drop: 'or drag and drop it here',
    dropActive: 'Drop the file to open it',
    replace: 'Open a different requirements.json',
    notJsonFile: 'This is not a .json file. Please choose the requirements.json file.',
    readFail: 'The file could not be read. Please try again.',
    errorTitle: 'We could not open this file',
  },
  parseErrors: {
    notJson: 'The file is not valid JSON. It may be damaged or not the right file.',
    noTender: 'The file has no "tender" section.',
    tenderField: (f: string) => `The tender details are missing "${f}".`,
    badDeadline: 'The submission deadline must be a real date written as YYYY-MM-DD.',
    noRequirements: 'The file has no list of required documents.',
    reqField: (i: number, f: string) => `Requirement #${i + 1} has a missing or wrong "${f}".`,
    dupReqId: (id: string) => `Two requirements use the same ID "${id}".`,
  },
  tender: {
    heading: 'Tender details',
    id: 'Tender ID',
    title: 'Title',
    entity: 'Procuring entity',
    bidder: 'Bidder',
    deadline: 'Submission deadline',
  },
  checklist: {
    heading: 'Required documents',
    count: (n: number) => `${n} documents`,
    mandatory: 'Required',
    optional: 'Optional',
    hasExpiry: 'Needs expiry date',
  },
  files: {
    heading: 'Your files',
    emptyNoTender: 'Open the requirements file first, then add your PDF files here.',
  },
};

export type Dict = typeof en;
