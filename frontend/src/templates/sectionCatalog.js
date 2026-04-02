// frontend/src/templates/sectionCatalog.js
// Canonical definition of sections and fields.
// Admin only chooses which sections to show; field content stays fixed.

export const SECTION_KEYS = [
  'core', 'job', 'switchboard', 'subBoard', 'inverter', 'battery', 'monitor', 'roof', 'mudmap', 'final'
];

export function getSectionCatalog() {
  return {
    core: {
      id: 'core', label: 'Core Details',
      sections: [{
        id: 'core-details', label: 'Core Details',
        fields: [
          { key: 'inspected_at', label: 'Inspected At', type: 'datetime', required: true },
          { key: 'inspector_name', label: 'Site Inspector Name', type: 'select', options: ['Ashley Bronson', 'Liam Jackman', 'Clarke Dean'], required: true },
          { 
            key: 'roof_type',
            label: 'Roof Type',
            type: 'select',
            options: [ 'Tin Colorbond',  'Tin Kliplock' , 'Tile Concrete' , 'Tile Terracotta' , 'Tile Shillings'],
            required: true
          },
                    { key: 'meter_phase', label: 'Meter Phase', type: 'select', options: ['Single','Double','Three'], required: true },
          { key: 'house_storey', label: 'House Storey', type: 'select', options: ['Single','Double','Triple'] },
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
          { key: 'jobDetails.inspectionCompany', label: 'Inspection Company', type: 'text', default: 'xTechs Renewables Pty Ltd' },
          { key: 'jobDetails.isMultiOccupancy', label: 'Is Multi‑Occupancy?', type: 'select', options: ['Yes','No'] },
          {
            key: 'jobDetails.consumerMains',
            label: 'Are the consumer mains overhead or underground?',
            type: 'select',
            options: ['Underground','Overhead'],
          },
          {
            key: 'jobDetails.storey',
            label: 'Is it single storey, double storey or triple storey house?',
            type: 'select',
            options: ['Single','Double','Multi'],
          },
          { key: 'jobDetails.lifeSupportRequired', label: 'Life Support Required', type: 'select', options: ['Yes','No'] },
          { key: 'jobDetails.licenseSelfie', label: 'License selfie (Photo)', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'jobDetails.fullHousePhoto', label: 'Full house/building image', type: 'photo', accept: 'image/*,application/pdf' }
        ]
      }]
    },
    switchboard: {
      id: 'switchboard', label: 'Switchboard / Main MSB',
      sections: [{
        id: 'msb', label: 'Switchboard / Main MSB',
        fields: [
          { key: 'switchboard.meterPhoto', label: 'Meter Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.meterNumber', label: 'Meter Number', type: 'text' },
          { key: 'switchboard.nmi', label: 'NMI', type: 'text' },
          { key: 'switchboard.isCompliant', label: 'Is Switchboard compliant?', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.phases', label: 'Phases on site', type: 'select', options: ['Single','Two','Three'] },
          { key: 'switchboard.biDirectionalMeter', label: 'Is there a bi-directional (smart) meter?', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.neutralEarthPhoto', label: 'Neutral & Earth Bar Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.asbestosPresent', label: 'Asbestos present?', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.mainSwitchRatingAmps', label: 'Main Switch Rating (A)', type: 'text' },
          { key: 'switchboard.pointOfAttachment', label: 'What is point of attachment?', type: 'text' },
          { key: 'switchboard.distanceTxToPOA', label: 'Distance of the Transformer to Point of attachment', type: 'text', placeholder: 'e.g., 75m' },
          { key: 'switchboard.distancePOAToMSB', label: 'Distance of the Point of attachment to MSB', type: 'text', placeholder: 'e.g., 15m' },
          { key: 'switchboard.consumerMainsCableSize', label: 'Cable Size of the Consumer Mains', type: 'text', placeholder: 'e.g., 16mm' },
          {
            key: 'switchboard.consumerMainsCableType',
            label: 'Cable type (single core/multicore) Aluminium or Copper',
            type: 'select',
            options: [
              'Single Core Aluminium',
              'Multi Core Aluminium',
              'Single Core Copper',
              'Multi Core Copper',
            ],
          },
          {
            key: 'switchboard.mainsRunMethod',
            label: 'How is the mains cable run?',
            type: 'select',
            options: [
              'Inside wall',
              'Cable tray',
              'In roof',
              'Underground',
              'Pole mounted - exposed to sun',
            ],
          },
          { key: 'switchboard.photoSwitchboardOn', label: 'Image of Switchboard (with front cover ON)', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.photoSwitchboardOff', label: 'Image of Switchboard (with front cover OFF)', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.voltageReadingPhotos', label: 'Voltage reading A–N / N–E / Phase to Phase', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'switchboard.inverterConnectedToMSB', label: 'Is Inverter to be connected to this MSB?', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.spaceForSmartMeter', label: 'Is there space for Smart meter (if required)?', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.spareSpaceSolarBreaker', label: 'Spare space for Solar Main Breaker?', type: 'select', options: ['Yes','No'] },
          { key: 'switchboard.distanceInverterFromMSB', label: 'Distance of Inverter from MSB', type: 'text', placeholder: 'e.g., 1m' }
        ]
      }]
    },
    subBoard: {
      id: 'subBoard', label: 'Sub-Board',
      sections: [{
        id: 'sub-board', label: 'Sub-Board',
        fields: [
          { key: 'subBoard.msbFeedsSubBoard', label: 'Is MSB feeding a Sub-Board (POC for inverter)?', type: 'select', options: ['Yes','No'] },
          { key: 'subBoard.subBoardPOCPhoto', label: 'Sub-Board / POC Photo (optional)', type: 'photo', accept: 'image/*,application/pdf' }
        ]
      }]
    },
    inverter: {
      id: 'inverter', label: 'Inverter Installation Location',
      sections: [{
        id: 'inverter-location', label: 'Inverter Installation Location',
        fields: [
          { key: 'inverterLocation.locationPhoto', label: 'Inverter location photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'inverterLocation.requireACIsolator', label: 'Require AC Isolator at location?', type: 'select', options: ['Yes','No'] },
          { key: 'inverterLocation.mountingMethod', label: 'Mounting Method', type: 'text', placeholder: 'Wall mounted / structure / other' },
          { key: 'inverterLocation.conduitRunDiscussed', label: 'Conduit Run Discussed with Customer?', type: 'select', options: ['Yes','No'] },
          { key: 'inverterLocation.notes', label: 'Notes', type: 'textarea' }
        ]
      }]
    },
    battery: {
      id: 'battery', label: 'Battery Details (Applicable only for Battery Jobs)',
      sections: [{
        id: 'battery-details', label: 'Battery Details',
        fields: [
          { key: 'battery.installingBattery', label: 'Are we installing a battery on this job?', type: 'select', options: ['Yes','No'] }
        ]
      }]
    },
    monitor: {
      id: 'monitor', label: 'Monitoring',
      sections: [
        {
          id: 'monitoring', label: 'Monitoring',
          fields: [
            { key: 'monitoring.wifiAtLocation', label: 'WiFi at inverter/battery location?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.strongReception', label: 'Strong reception near inverter?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.ethernetRunnable', label: 'Ethernet runnable from router to inverter?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.spareRouterPort', label: 'Spare port in router?', type: 'select', options: ['Yes','No'] },
            { key: 'monitoring.wifiName', label: 'WiFi Name', type: 'text' },
            { key: 'monitoring.wifiPassword', label: 'WiFi Password', type: 'text' },
            { key: 'monitoring.distanceToEthernetPort', label: 'Distance to Ethernet Port', type: 'text', placeholder: 'e.g., 15m' }
          ]
        },
        {
          id: 'existing', label: 'Existing System',
          fields: [
            { key: 'existingSystem.existingSolar', label: 'Existing solar on site?', type: 'select', options: ['Yes','No'] },
            { key: 'existingSystem.existingBattery', label: 'Existing battery on site?', type: 'select', options: ['Yes','No'] }
          ]
        }
      ]
    },
    roof: {
      id: 'roof', label: 'Roof Type',
      sections: [{
        id: 'roof-profile', label: 'Roof Type',
        fields: [
          { key: 'roofProfile.roofHeightMeters', label: 'Roof Height (m)', type: 'text', placeholder: 'e.g., 5.2' },
          { key: 'roofProfile.safeAccess', label: 'Safe & clear access to roof?', type: 'select', options: ['Yes','No'] },
          {
            key: 'roofProfile.accessMethod',
            label: 'By what method access will be achieved to the roof?',
            type: 'select',
            options: ['Extension Ladder','Scissor Lift','Boom Lift'],
          },
          {
            key: 'roofProfile.panelCarryMethod',
            label: 'By what method panels will be taken to access the roof?',
            type: 'select',
            options: ['Hand Passed','Scissor Lift','Boom Lift','Crane Lift'],
          },
          { key: 'roofProfile.edgeProtectionRequired', label: 'Edge Protection required?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.edgeProtectionAvailable', label: 'Edge Protection available?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.edgeProtectionMeters', label: 'Meters of Edge Protection', type: 'text', placeholder: 'e.g., 20' },
          { key: 'roofProfile.edgeProtectionPhoto', label: 'Upload image showing Edge Protection location', type: 'photo', accept: 'image/*,application/pdf' },
          {
            key: 'roofProfile.roofMaterial',
            label: 'Roof Type',
            type: 'select',
            options: ['Tin Colorbond','Tin Kliplock','Tile Concrete','Tile Terracotta','Tile Shillings'],
            allowOther: true,
          },
          { key: 'roofProfile.roofConditionOK', label: 'Roof in suitable condition?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.section1Pitch', label: 'Section 1 pitch', type: 'text' },
          { key: 'roofProfile.section1Photo', label: 'Upload Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'roofProfile.section2Pitch', label: 'Section 2 pitch (if applicable)', type: 'text' },
          { key: 'roofProfile.section2Photo', label: 'Upload Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'roofProfile.section3Pitch', label: 'Section 3 pitch (if applicable)', type: 'text' },
          { key: 'roofProfile.section3Photo', label: 'Upload Photo', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'roofProfile.anchorPoints', label: 'Anchor points on roof?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.skylightsPresent', label: 'Skylights present?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.proposedDesignFits', label: 'Proposed design fits roof?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.tiltsRequired', label: 'Tilts required?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.tiltAngle', label: 'Tilt angle (if required)', type: 'text', placeholder: 'e.g., 18°' },
          { key: 'roofProfile.spareTilesOnSite', label: 'Spare tiles on site (10–15)?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.structureToMountModules', label: 'Structure to mount modules', type: 'text', placeholder: 'e.g., House' },
          { key: 'roofProfile.anyShadingIssues', label: 'Any shading issues?', type: 'select', options: ['Yes','No'] },
          { key: 'roofProfile.dcCableRunMeters', label: 'DC Cable Run (m)', type: 'text' },
          { key: 'roofProfile.dcConduitMeters', label: 'DC Conduit (m)', type: 'text' }
        ]
      }]
    },
    mudmap: {
      id: 'mudmap', label: 'Mud Map',
      sections: [{
        id: 'mud-map', label: 'Mud Map',
        fields: [
          { key: 'mudMap.mapPhoto', label: 'Mud Map (mark inverter, MSB/Sub-Board, POC/TX, access)', type: 'photo', accept: 'image/*,application/pdf' },
          { key: 'mudMap.accessNotes', label: 'Access notes', type: 'textarea', placeholder: 'Proposed roof access location, etc.' }
        ]
      }]
    },
    final: {
      id: 'final', label: 'Final Checks',
      sections: [
        {
          id: 'shading', label: 'Shading Assessment',
          fields: [
            { key: 'shading.sources', label: 'Sources of shading (multi-select)', type: 'multiselect',
              options: ['No significant shading', 'Partial shading in afternoon', 'Heavy shading from adjacent buildings', 'Partial shading in morning', 'Heavy shading from trees', 'Other'] },
            { key: 'shading.other', label: 'Other shading', type: 'text', placeholder: 'e.g., vent near array',
              visibleIf: { field: 'shading.sources', operator: 'in', value: ['Other'] } }
          ]
        },
        {
          id: 'electrical', label: 'Electrical Hazards',
          fields: [
            { key: 'electrical.hazards', label: 'Electrical Hazards', type: 'multiselect',
              options: ['Exposed wiring', 'Water damage', 'Overloaded circuits', 'Corrosion', 'Faulty breakers', 'Code violations', 'Poor grounding', 'Other'] },
            { key: 'electrical.other', label: 'Other hazard', type: 'text' },
            { key: 'electrical.describeOther', label: 'Describe other hazard', type: 'text' },
            { key: 'electrical.notes', label: 'Hazard notes', type: 'textarea' },
            { key: 'electrical.mitigations', label: 'Mitigations / recommendations', type: 'textarea' }
          ]
        },
        {
          id: 'recommendations', label: 'Recommendations',
          fields: [
            { key: 'recommendations.count', label: 'Number of options', type: 'select', options: ['0','1','2','3','4','5','6','7','8','9','10'] },
            { key: 'recommendations.summary', label: 'Summary (optional)', type: 'textarea', placeholder: 'Overall recommendation context' },
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
        },
        {
          id: 'mediaSummary', label: 'Media Summary',
          fields: [
            {
              key: 'mediaSummary.note',
              label: 'Media Summary',
              type: 'textarea',
              placeholder: 'Photos uploaded across sections including Meter, Switchboard, Roof Sections, Edge Protection, Mud Map, etc., are listed here.',
            }
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