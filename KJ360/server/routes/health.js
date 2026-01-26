import { Router } from 'express';
import fs from 'fs/promises';
import { join } from 'path';

const router = Router();

router.get('/', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');

  try {
    // Check vault accessibility
    await fs.access(vaultRoot);
    const dailyFolder = join(vaultRoot, 'Daily');
    await fs.access(dailyFolder);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      vault: {
        path: vaultRoot,
        accessible: true
      },
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      vault: {
        path: vaultRoot,
        accessible: false,
        error: error.message
      }
    });
  }
});

export default router;
