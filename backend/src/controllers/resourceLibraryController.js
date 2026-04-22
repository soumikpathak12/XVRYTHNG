import * as resourceLibraryService from '../services/resourceLibraryService.js';

export async function listResources(req, res) {
  try {
    const companyId = req.user?.companyId ?? null;
    const items = await resourceLibraryService.listResources({ companyId });
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    console.error('List resource library error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load resources.',
    });
  }
}

export async function createResource(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const companyId = req.user?.companyId ?? null;
    const created = await resourceLibraryService.createResource({
      companyId,
      createdBy: userId,
      title: req.body?.title,
      category: req.body?.category,
      sectionName: req.body?.section_name,
      resourceType: req.body?.resource_type,
      imageUrl: req.body?.image_url,
      linkUrl: req.body?.link_url,
      notes: req.body?.notes,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    const msg = String(err?.message || '');
    if (
      msg.toLowerCase().includes('required') ||
      msg.toLowerCase().includes('title')
    ) {
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Create resource library item error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create resource.',
    });
  }
}

export async function deleteResource(req, res) {
  try {
    const companyId = req.user?.companyId ?? null;
    const ok = await resourceLibraryService.deleteResource({
      id: req.params.id,
      companyId,
    });
    if (!ok) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete resource library item error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resource.',
    });
  }
}
