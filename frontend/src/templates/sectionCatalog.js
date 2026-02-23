// frontend/src/templates/sectionCatalog.js
// Canonical definition of sections and fields.
// Admin only chooses which sections to show; field content stays fixed.

export const SECTION_KEYS = [
  'core', 'job', 'switchboard', 'subBoard', 'inverter', 'monitor', 'roof', 'mudmap', 'final'
];

export function getSectionCatalog() {
  return {
    core: {
      id: 'core', label: 'Core Details',
      sections: [{
        id: 'core-details', label: 'Core Details',
        fields: [
          { key: 'inspected_at', label: 'Inspected At', type: 'datetime', required: true },
          { key: 'inspector_name', label: 'Inspector Name', type: 'text', required: true },
          { key: 'roof_type', label: 'Roof Type', type: 'text', placeholder: 'Tile / Tin / Flat / ...', required: true },
          { key: 'meter_phase', label: 'Meter Phase', type: 'select', options: ['single','three'], required: true },
          { key: 'house_storey', label: 'House Storey', type: 'select', options: ['single','double','triple'] },
          { key: 'inverter_location', label: 'Inverter Location', type: 'text', placeholder: 'Garage wall / near MSB', required: true },
          { key: 'msb_condition', label: 'Main Switchboard Condition', type: 'textarea', required: true },
          { key: 'roof_pitch_deg', label: 'Roof Pitch (deg)', type: 'number' },
          { key: 'shading', label: 'Shading (legacy note)', type: 'text' }
        ]
      }]
    },
    job: {
      id: 'job', label: 'Job Details',
      sections: [{
        id: 'jobdetails', label: 'Job Details',
        fields: [
          { key: 'jobDetails.inspectionCompany', label: 'Inspection Company', type: 'text', default: 'xTechs Renewables' },
          { key: 'jobDetails.isMultiOccupancy', label: 'Is Multi‑Occupancy?', type: 'select', options: ['Yes','No'] },
          { key: 'jobDetails.consumerMains', label: 'Consumer Mains', type: 'select', options: ['Overhead','Underground'] },
          { key: 'jobDetails.storey', label: 'Storey', type: 'select', options: ['Single','Double','Multi'] },
          { key: 'jobDetails.lifeSupportRequired', label: 'Life Support Required', type: 'select', options: ['Yes','No'] },
          { key: 'jobDetails.licenseSelfie', label: 'License selfie (Photo)', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'jobDetails.fullHousePhoto', label: 'Full house/building image', type: 'photo', accept: 'image/*,application/pdf' }
        ]
      }]
    },
    switchboard: {
      id: 'switchboard', label: 'Switchboard',
      sections: [{
        id: 'msb', label: 'Main Switchboard / MSB',
        fields: [
          { key: 'switchboard.meterNumber', label: 'Meter Number', type: 'text' },
          { key: 'switchboard.nmi', label: 'NMI', type: 'text' },
          { key: 'switchboard.isCompliant', label: 'Compliant?', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.phases', label: 'Phases', type: 'select', options: ['Single','Two','Three'] },
          { key: 'switchboard.biDirectionalMeter', label: 'Bi-directional Meter', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.asbestosPresent', label: 'Asbestos Present', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.mainSwitchRatingAmps', label: 'Main Switch Rating (A)', type: 'text' },
          { key: 'switchboard.pointOfAttachment', label: 'Point of Attachment', type: 'text' },
          { key: 'switchboard.distanceTxToPOA', label: 'TX → POA (m)', type: 'text', placeholder: '75m' },
          { key: 'switchboard.distancePOAToMSB', label: 'POA → MSB (m)', type: 'text', placeholder: '15m' },
          { key: 'switchboard.consumerMainsCableSize', label: 'Consumer Mains Cable Size', type: 'text', placeholder: '16mm' },
          { key: 'switchboard.consumerMainsCableType', label: 'Consumer Mains Cable Type', type: 'select',
            options: ['Single Core / Copper','Single Core / Aluminium','Multi Core / Copper','Multi Core / Aluminium'] },
          { key: 'switchboard.mainsRunMethod', label: 'Mains Cable Run', type: 'text', placeholder: 'Inside wall / underground' },
          { key: 'switchboard.meterPhoto', label: 'Meter Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.neutralEarthPhoto', label: 'Neutral & Earth Bar Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.photoSwitchboardOn', label: 'Switchboard (cover ON)', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.photoSwitchboardOff', label: 'Switchboard (cover OFF)', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.voltageReadingPhotos', label: 'Voltage reading photos (A‑N / N‑E / P‑P)', type: 'array' }
        ]
      }]
    },
    subBoard: {
      id: 'subBoard', label: 'Sub‑Board',
      sections: [{
        id: 'sub-board', label: 'Sub‑Board',
        fields: [
          { key: 'subBoard.msbFeedsSubBoard', label: 'MSB feeds Sub‑Board (POC)?', type: 'select', options: ['Yes','No'] },
          { key: 'subBoard.subBoardPOCPhoto', label: 'Sub‑Board / POC Photo', type: 'photo', accept: 'image/*,application/pdf' }
        ]
      }]
    },
    inverter: {
      id: 'inverter', label: 'Inverter Location',
      sections: [{
        id: 'inverter-location', label: 'Inverter Location',
        fields: [
          { key: 'inverterLocation.locationPhoto', label: 'Inverter location photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'inverterLocation.requireACIsolator', label: 'Require AC Isolator?', type: 'select', options: ['Yes','No'] },
          { key: 'inverterLocation.mountingMethod', label: 'Mounting Method', type: 'text', placeholder: 'Wall mounted / structure / other' },
          { key: 'inverterLocation.ventilationOK', label: 'Ventilation OK?', type: 'select', options: ['Yes','No'] },
          { key: 'inverterLocation.backingBoardNeeded', label: 'Backing Board Needed?', type: 'select', options: ['Yes','No'] },
          { key: 'inverterLocation.directSunlight', label: 'Direct Sunlight?', type: 'select', options: ['Yes','No'] },
          { key: 'inverterLocation.conduitRunDiscussed', label: 'Conduit Run Discussed?', type: 'select', options: ['Yes','No'] },
          { key: 'inverterLocation.notes', label: 'Notes', type: 'textarea' }
        ]
      }]
    },
    monitor: {
      id: 'monitor', label: 'Monitoring & Existing',
      sections: [
        {
          id: 'monitoring', label: 'Monitoring',
          fields: [
            { key: 'monitoring.wifiAtLocation', label: 'Wi‑Fi at Location?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.strongReception', label: 'Strong Reception?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.ethernetRunnable', label: 'Ethernet Runnable?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.spareRouterPort', label: 'Spare Router Port?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.wifiName', label: 'Wi‑Fi Name', type: 'text' },
            { key: 'monitoring.wifiPassword', label: 'Wi‑Fi Password', type: 'text' },
            { key: 'monitoring.distanceToEthernetPort', label: 'Distance to Ethernet Port', type: 'text', placeholder: '15m' }
          ]
        },
        {
          id: 'existing', label: 'Existing System',
          fields: [
            { key: 'existingSystem.existingSolar', label: 'Existing Solar?', type: 'select', options: ['Yes','No'] },
            { key: 'existingSystem.existingBattery', label: 'Existing Battery?', type: 'select', options: ['Yes','No'] }
          ]
        }
      ]
    },
    roof: {
      id: 'roof', label: 'Roof Profile',
      sections: [{
        id: 'roof-profile', label: 'Roof Profile Details',
        fields: [
          { key: 'roofProfile.roofHeightMeters', label: 'Roof Height (m)', type: 'text', placeholder: '5.2' },
          { key: 'roofProfile.safeAccess', label: 'Safe Access?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.accessMethod', label: 'Access Method', type: 'select', options: ['Extension Ladder','Scissor Lift','Boom Lift'] },
          { key: 'roofProfile.panelCarryMethod', label: 'Panel Carry Method', type: 'select', options: ['Hand Passed','Scissor Lift','Boom Lift','Crane Lift'] },
          { key: 'roofProfile.edgeProtectionRequired', label: 'Edge Protection Required?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.edgeProtectionAvailable', label: 'Edge Protection Available?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.edgeProtectionMeters', label: 'Edge Protection (m)', type: 'text', placeholder: '20' },
          { key: 'roofProfile.edgeProtectionPhoto', label: 'Edge Protection Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'roofProfile.roofMaterial', label: 'Roof Type', type: 'select', options: ['Tin Colorbond','Tin Kliplock','Tile Concrete','Tile Terracotta'] },
          { key: 'roofProfile.roofConditionOK', label: 'Roof Condition OK?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.section1Pitch', label: 'Section 1 Pitch', type: 'text' },
          { key: 'roofProfile.section1Photo', label: 'Section 1 Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'roofProfile.section2Pitch', label: 'Section 2 Pitch', type: 'text' },
          { key: 'roofProfile.section2Photo', label: 'Section 2 Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'roofProfile.section3Pitch', label: 'Section 3 Pitch', type: 'text' },
          { key: 'roofProfile.section3Photo', label: 'Section 3 Photo', type: 'photo', accept: 'image/*,application/pdf' }
        ]
      }]
    },
    mudmap: {
      id: 'mudmap', label: 'Mud Map',
      sections: [{
        id: 'mud-map', label: 'Mud Map',
        fields: [
          { key: 'mudMap.mapPhoto', label: 'Mud Map Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'mudMap.accessNotes', label: 'Access Notes', type: 'text', placeholder: 'POC/TX, access routes...' }
        ]
      }]
    },
    final: {
      id: 'final', label: 'Final Checks',
      sections: [
        {
          id: 'shading', label: 'Shading Assessment',
          fields: [
            { key: 'shading.sources', label: 'Shading (multi-select)', type: 'multiselect',
              options: ['No significant shading', 'Partial AM', 'Partial PM', 'Heavy (trees)', 'Heavy (buildings)', 'Other'] },
            { key: 'shading.other', label: 'Other shading', type: 'text',
              visibleIf: { field: 'shading.sources', operator: 'in', value: ['Other'] } }
          ]
        },
        {
          id: 'electrical', label: 'Electrical Hazards',
          fields: [
            { key: 'electrical.hazards', label: 'Electrical Hazards (multi-select)', type: 'multiselect',
              options: ['Exposed wiring', 'Water damage', 'Overloaded circuits', 'Corrosion', 'Faulty breakers', 'Code violations', 'Poor grounding', 'Other'] },
            { key: 'electrical.other', label: 'Other hazard', type: 'text' },
            { key: 'electrical.notes', label: 'Hazard notes', type: 'text', placeholder: 'Mitigations / recommendations' }
          ]
        },
        {
          id: 'recommendations', label: 'Recommendations',
          fields: [
            { key: 'recommendations.count', label: 'Number of options', type: 'select', options: ['0','1','2','3','4','5','6','7','8','9','10'] },
            { key: 'recommendations.summary', label: 'Summary (optional)', type: 'text' },
            { key: 'recommendations.items[0]', label: 'Option 1', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['1','2','3','4','5','6','7','8','9','10'] } },
            { key: 'recommendations.items[1]', label: 'Option 2', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['2','3','4','5','6','7','8','9','10'] } },
            { key: 'recommendations.items[2]', label: 'Option 3', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['3','4','5','6','7','8','9','10'] } },
            { key: 'recommendations.items[3]', label: 'Option 4', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['4','5','6','7','8','9','10'] } },
            { key: 'recommendations.items[4]', label: 'Option 5', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['5','6','7','8','9','10'] } },
            { key: 'recommendations.items[5]', label: 'Option 6', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['6','7','8','9','10'] } },
            { key: 'recommendations.items[6]', label: 'Option 7', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['7','8','9','10'] } },
            { key: 'recommendations.items[7]', label: 'Option 8', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['8','9','10'] } },
            { key: 'recommendations.items[8]', label: 'Option 9', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'in', value: ['9','10'] } },
            { key: 'recommendations.items[9]', label: 'Option 10', type: 'text', visibleIf: { field: 'recommendations.count', operator: 'eq', value: '10' } }
          ]
        }
      ]
    }
  };
}

// Build steps from enabled section keys; if none -> all.
export function buildStepsFromEnabled(enabledSections) {
  const catalog = getSectionCatalog();
  const keys = Array.isArray(enabledSections) && enabledSections.length
    ? enabledSections
    : SECTION_KEYS;
  const steps = [];
  for (const k of keys) {
    const entry = catalog[k];
    if (!entry) continue;
    steps.push({ id: entry.id, label: entry.label, sections: entry.sections });
  }
  return steps;
}