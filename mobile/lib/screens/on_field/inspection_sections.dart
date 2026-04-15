class InspectionSection {
  final String id;
  final String label;
  final List<InspectionField> fields;

  InspectionSection({required this.id, required this.label, required this.fields});
}

enum InspectionFieldType {
  text,
  number,
  textarea,
  select,
  multiselect,
  photo,
  datetime,
}

class InspectionField {
  final String key;
  final String label;
  final InspectionFieldType type;
  final List<String>? options;
  final bool required;
  final String? placeholder;
  final String? defaultValue;

  InspectionField({
    required this.key,
    required this.label,
    required this.type,
    this.options,
    this.required = false,
    this.placeholder,
    this.defaultValue,
  });
}

final List<InspectionSection> inspectionSections = [
  InspectionSection(
    id: 'core',
    label: 'Core Details',
    fields: [
      InspectionField(key: 'inspected_at', label: 'Inspected At', type: InspectionFieldType.datetime, required: true),
      InspectionField(
        key: 'inspector_name',
        label: 'Site Inspector Name',
        type: InspectionFieldType.select,
        options: ['Ashley Bronson', 'Liam Jackman', 'Clarke Dean'],
        required: true,
      ),
      InspectionField(
        key: 'roof_type',
        label: 'Roof Type',
        type: InspectionFieldType.select,
        options: ['Tin Colorbond', 'Tin Kliplock', 'Tile Concrete', 'Tile Terracotta', 'Tile Shillings'],
        required: true,
      ),
      InspectionField(
        key: 'meter_phase',
        label: 'Meter Phase',
        type: InspectionFieldType.select,
        options: ['Single', 'Double', 'Three'],
        required: true,
      ),
      InspectionField(
        key: 'house_storey',
        label: 'House Storey',
        type: InspectionFieldType.select,
        options: ['Single', 'Double', 'Triple'],
      ),
      InspectionField(
        key: 'inverter_location',
        label: 'Inverter Location',
        type: InspectionFieldType.text,
        placeholder: 'Garage wall / near MSB',
        required: true,
      ),
      InspectionField(
        key: 'msb_condition',
        label: 'Main Switchboard Condition',
        type: InspectionFieldType.textarea,
        required: true,
      ),
      InspectionField(key: 'roof_pitch_deg', label: 'Roof Pitch (deg)', type: InspectionFieldType.number),
      InspectionField(key: 'shading', label: 'Shading (legacy note)', type: InspectionFieldType.text),
    ],
  ),
  InspectionSection(
    id: 'job',
    label: 'Job Details',
    fields: [
      InspectionField(
        key: 'jobDetails.inspectionCompany',
        label: 'Inspection Company',
        type: InspectionFieldType.text,
        defaultValue: 'xTechs Renewables Pty Ltd',
      ),
      InspectionField(
        key: 'jobDetails.isMultiOccupancy',
        label: 'Is Multi‑Occupancy?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'jobDetails.consumerMains',
        label: 'Are the consumer mains overhead or underground?',
        type: InspectionFieldType.select,
        options: ['Underground', 'Overhead'],
      ),
      InspectionField(
        key: 'jobDetails.storey',
        label: 'Is it single storey, double storey or triple storey house?',
        type: InspectionFieldType.select,
        options: ['Single', 'Double', 'Multi'],
      ),
      InspectionField(
        key: 'jobDetails.lifeSupportRequired',
        label: 'Life Support Required',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'jobDetails.licenseSelfie', label: 'License selfie (Photo)', type: InspectionFieldType.photo),
      InspectionField(key: 'jobDetails.fullHousePhoto', label: 'Full house/building image', type: InspectionFieldType.photo),
    ],
  ),
  InspectionSection(
    id: 'switchboard',
    label: 'Switchboard / Main MSB',
    fields: [
      InspectionField(key: 'switchboard.meterPhoto', label: 'Meter Photo', type: InspectionFieldType.photo),
      InspectionField(key: 'switchboard.meterNumber', label: 'Meter Number', type: InspectionFieldType.text),
      InspectionField(key: 'switchboard.nmi', label: 'NMI', type: InspectionFieldType.text),
      InspectionField(
        key: 'switchboard.isCompliant',
        label: 'Is Switchboard compliant?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'switchboard.phases',
        label: 'Phases on site',
        type: InspectionFieldType.select,
        options: ['Single', 'Two', 'Three'],
      ),
      InspectionField(
        key: 'switchboard.biDirectionalMeter',
        label: 'Is there a bi-directional (smart) meter?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'switchboard.neutralEarthPhoto', label: 'Neutral & Earth Bar Photo', type: InspectionFieldType.photo),
      InspectionField(
        key: 'switchboard.asbestosPresent',
        label: 'Asbestos present?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'switchboard.mainSwitchRatingAmps', label: 'Main Switch Rating (A)', type: InspectionFieldType.text),
      InspectionField(key: 'switchboard.pointOfAttachment', label: 'What is point of attachment?', type: InspectionFieldType.text),
      InspectionField(key: 'switchboard.distanceTxToPOA', label: 'Distance of Transformer to POA', type: InspectionFieldType.text),
      InspectionField(key: 'switchboard.distancePOAToMSB', label: 'Distance of POA to MSB', type: InspectionFieldType.text),
      InspectionField(key: 'switchboard.consumerMainsCableSize', label: 'Cable Size of Consumer Mains', type: InspectionFieldType.text),
      InspectionField(
        key: 'switchboard.consumerMainsCableType',
        label: 'Cable type (AL/CU)',
        type: InspectionFieldType.select,
        options: ['Single Core Aluminium', 'Multi Core Aluminium', 'Single Core Copper', 'Multi Core Copper'],
      ),
      InspectionField(
        key: 'switchboard.mainsRunMethod',
        label: 'How is the mains cable run?',
        type: InspectionFieldType.select,
        options: ['Inside wall', 'Cable tray', 'In roof', 'Underground', 'Pole mounted'],
      ),
      InspectionField(key: 'switchboard.photoSwitchboardOn', label: 'Image of Switchboard (cover ON)', type: InspectionFieldType.photo),
      InspectionField(key: 'switchboard.photoSwitchboardOff', label: 'Image of Switchboard (cover OFF)', type: InspectionFieldType.photo),
      InspectionField(key: 'switchboard.voltageReadingPhotos', label: 'Voltage reading A–N / N–E photos', type: InspectionFieldType.photo),
      InspectionField(
        key: 'switchboard.inverterConnectedToMSB',
        label: 'Is Inverter to be connected to this MSB?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'switchboard.spaceForSmartMeter',
        label: 'Space for Smart meter?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'switchboard.spareSpaceSolarBreaker',
        label: 'Spare space for Solar Main Breaker?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'switchboard.distanceInverterFromMSB', label: 'Distance of Inverter from MSB', type: InspectionFieldType.text),
    ],
  ),
  InspectionSection(
    id: 'subBoard',
    label: 'Sub-Board',
    fields: [
      InspectionField(
        key: 'subBoard.msbFeedsSubBoard',
        label: 'Is MSB feeding a Sub-Board (POC for inverter)?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'subBoard.subBoardPOCPhoto', label: 'Sub-Board / POC Photo (optional)', type: InspectionFieldType.photo),
    ],
  ),
  InspectionSection(
    id: 'inverter',
    label: 'Inverter Installation Location',
    fields: [
      InspectionField(key: 'inverterLocation.locationPhoto', label: 'Inverter location photo', type: InspectionFieldType.photo),
      InspectionField(
        key: 'inverterLocation.requireACIsolator',
        label: 'Require AC Isolator at location?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'inverterLocation.mountingMethod', label: 'Mounting Method', type: InspectionFieldType.text, placeholder: 'Wall mounted / structure'),
      InspectionField(
        key: 'inverterLocation.conduitRunDiscussed',
        label: 'Conduit Run Discussed with Customer?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'inverterLocation.notes', label: 'Inverter Notes', type: InspectionFieldType.textarea),
    ],
  ),
  InspectionSection(
    id: 'battery',
    label: 'Battery Details',
    fields: [
      InspectionField(
        key: 'battery.installingBattery',
        label: 'Are we installing a battery on this job?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
    ],
  ),
  InspectionSection(
    id: 'monitor',
    label: 'Monitoring & Existing System',
    fields: [
      InspectionField(
        key: 'monitoring.wifiAtLocation',
        label: 'WiFi at inverter/battery location?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'monitoring.strongReception',
        label: 'Strong reception near inverter?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'monitoring.ethernetRunnable',
        label: 'Ethernet runnable from router to inverter?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'monitoring.spareRouterPort',
        label: 'Spare port in router?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'monitoring.wifiName', label: 'WiFi Name', type: InspectionFieldType.text),
      InspectionField(key: 'monitoring.wifiPassword', label: 'WiFi Password', type: InspectionFieldType.text),
      InspectionField(key: 'monitoring.distanceToEthernetPort', label: 'Distance to Ethernet Port', type: InspectionFieldType.text),
      InspectionField(
        key: 'existingSystem.existingSolar',
        label: 'Existing solar on site?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'existingSystem.existingBattery',
        label: 'Existing battery on site?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
    ],
  ),
  InspectionSection(
    id: 'roof',
    label: 'Roof Details',
    fields: [
      InspectionField(key: 'roofProfile.roofHeightMeters', label: 'Roof Height (m)', type: InspectionFieldType.text, placeholder: 'e.g., 5.2'),
      InspectionField(
        key: 'roofProfile.safeAccess',
        label: 'Safe & clear access to roof?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'roofProfile.accessMethod',
        label: 'Access method achieved to the roof?',
        type: InspectionFieldType.select,
        options: ['Extension Ladder', 'Scissor Lift', 'Boom Lift'],
      ),
      InspectionField(
        key: 'roofProfile.panelCarryMethod',
        label: 'Method panels taken to access the roof?',
        type: InspectionFieldType.select,
        options: ['Hand Passed', 'Scissor Lift', 'Boom Lift', 'Crane Lift'],
      ),
      InspectionField(
        key: 'roofProfile.edgeProtectionRequired',
        label: 'Edge Protection required?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'roofProfile.edgeProtectionAvailable',
        label: 'Edge Protection available?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'roofProfile.edgeProtectionMeters', label: 'Meters of Edge Protection', type: InspectionFieldType.text),
      InspectionField(key: 'roofProfile.edgeProtectionPhoto', label: 'Edge Protection Photo', type: InspectionFieldType.photo),
      InspectionField(
        key: 'roofProfile.roofMaterial',
        label: 'Roof type',
        type: InspectionFieldType.select,
        options: ['Tin Colorbond', 'Tin Kliplock', 'Tile Concrete', 'Tile Terracotta', 'Tile Shillings'],
      ),
      InspectionField(
        key: 'roofProfile.roofConditionOK',
        label: 'Roof in suitable condition?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'roofProfile.section1Pitch', label: 'Section 1 pitch', type: InspectionFieldType.text),
      InspectionField(key: 'roofProfile.section1Photo', label: 'Section 1 Photo', type: InspectionFieldType.photo),
      InspectionField(key: 'roofProfile.section2Pitch', label: 'Section 2 pitch (if applicable)', type: InspectionFieldType.text),
      InspectionField(key: 'roofProfile.section2Photo', label: 'Section 2 Photo', type: InspectionFieldType.photo),
      InspectionField(key: 'roofProfile.section3Pitch', label: 'Section 3 pitch (if applicable)', type: InspectionFieldType.text),
      InspectionField(key: 'roofProfile.section3Photo', label: 'Section 3 Photo', type: InspectionFieldType.photo),
      InspectionField(
        key: 'roofProfile.anchorPoints',
        label: 'Anchor points on roof?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'roofProfile.skylightsPresent',
        label: 'Skylights present?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'roofProfile.proposedDesignFits',
        label: 'Proposed design fits roof?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'roofProfile.tiltsRequired',
        label: 'Tilts required?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'roofProfile.tiltAngle',
        label: 'Tilt angle (if required)',
        type: InspectionFieldType.text,
        placeholder: 'e.g., 18°',
      ),
      InspectionField(
        key: 'roofProfile.spareTilesOnSite',
        label: 'Spare tiles on site (10-15)?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(
        key: 'roofProfile.structureToMountModules',
        label: 'Structure to mount modules',
        type: InspectionFieldType.text,
        placeholder: 'e.g., House',
      ),
      InspectionField(
        key: 'roofProfile.anyShadingIssues',
        label: 'Any shading issues?',
        type: InspectionFieldType.select,
        options: ['Yes', 'No'],
      ),
      InspectionField(key: 'roofProfile.dcCableRunMeters', label: 'DC Cable Run (m)', type: InspectionFieldType.text),
      InspectionField(key: 'roofProfile.dcConduitMeters', label: 'DC Conduit (m)', type: InspectionFieldType.text),
    ],
  ),
  InspectionSection(
    id: 'mudmap',
    label: 'Mud Map',
    fields: [
      InspectionField(key: 'mudMap.mapPhoto', label: 'Mud Map (mark inverter, MSB, POC)', type: InspectionFieldType.photo),
      InspectionField(key: 'mudMap.accessNotes', label: 'Access notes', type: InspectionFieldType.textarea, placeholder: 'Proposed roof access location'),
    ],
  ),
  InspectionSection(
    id: 'final',
    label: 'Final Checks & Sign-off',
    fields: [
      InspectionField(
        key: 'shading.sources',
        label: 'Sources of shading',
        type: InspectionFieldType.multiselect,
        options: [
          'No significant shading',
          'Partial shading in afternoon',
          'Heavy shading from adjacent buildings',
          'Partial shading in morning',
          'Heavy shading from trees',
          'Other'
        ],
      ),
      InspectionField(key: 'shading.other', label: 'Other shading source', type: InspectionFieldType.text),
      InspectionField(
        key: 'electrical.hazards',
        label: 'Electrical Hazards',
        type: InspectionFieldType.multiselect,
        options: [
          'Exposed wiring',
          'Water damage',
          'Overloaded circuits',
          'Corrosion',
          'Faulty breakers',
          'Code violations',
          'Poor grounding',
          'Other'
        ],
      ),
      InspectionField(key: 'electrical.notes', label: 'Hazard notes', type: InspectionFieldType.textarea),
      InspectionField(
        key: 'recommendations.count',
        label: 'Number of recommendation options',
        type: InspectionFieldType.select,
        options: ['0', '1', '2', '3', '4', '5'],
      ),
      InspectionField(key: 'recommendations.summary', label: 'Summary Recommendation', type: InspectionFieldType.textarea),
      InspectionField(key: 'mediaSummary.note', label: 'Final Media Summary Note', type: InspectionFieldType.textarea),
      InspectionField(
        key: 'customer_name',
        label: 'Customer Name',
        type: InspectionFieldType.text,
        required: true,
        placeholder: 'Full name',
      ),
      InspectionField(
        key: 'signature_url',
        label: 'Customer Signature',
        type: InspectionFieldType.photo,
        required: true,
      ),
      InspectionField(
        key: 'customer_notes',
        label: 'Customer Notes (optional)',
        type: InspectionFieldType.textarea,
        placeholder: 'Any additional notes...',
      ),
    ],
  ),
];
