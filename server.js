const express = require('express');
const cors = require('cors');
const { runBatchAutomation } = require('./automation');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Initialize Supabase client with service role key for backend operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (required by Render.com)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: ['puppeteer', 'supabase']
  });
});

// Get supported platforms
app.get('/api/platforms', (req, res) => {
  const platforms = [
    { id: 'lovable', name: 'Lovable.dev', url: 'https://lovable.dev', type: 'web' },
    { id: 'v0', name: 'V0.dev', url: 'https://v0.vercel.app', type: 'web' },
    { id: 'bolt_new', name: 'Bolt.new', url: 'https://bolt.new', type: 'web' },
    { id: 'replit', name: 'Replit', url: 'https://replit.com', type: 'web' },
    { id: 'cursor', name: 'Cursor', type: 'local', note: 'Requires local setup' },
    { id: 'windsurf', name: 'Windsurf', type: 'local', note: 'Requires local setup' },
    { id: 'bolt_diy', name: 'Bolt.DIY', type: 'local', note: 'Requires local setup' }
  ];
  
  res.json(platforms);
});

// NEW: Check if batch exists endpoint (fixes the 404 errors)
app.get('/api/batch-exists/:batch_id', async (req, res) => {
  try {
    const { batch_id } = req.params;
    
    if (!batch_id) {
      return res.status(400).json({ 
        error: 'Missing batch_id parameter' 
      });
    }

    console.log(`Checking if batch exists: ${batch_id}`);

    // Query the batches table to check if batch exists
    const { data: batch, error } = await supabase
      .from('batches')
      .select('id')
      .eq('id', batch_id)
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // If it's a "not found" error, return exists: false
      if (error.code === 'PGRST116') {
        console.log(`Batch not found: ${batch_id}`);
        return res.status(200).json({ exists: false });
      }
      
      // For other database errors, return 500
      return res.status(500).json({ 
        error: 'Database query failed', 
        details: error.message 
      });
    }

    // If we get here, the batch exists
    console.log(`Batch found: ${batch_id}`);
    res.status(200).json({ exists: true });

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Main batch processing endpoint
app.post('/api/run-batch', async (req, res) => {
  try {
    const { batch_id, platform, delay_between_prompts = 5000, max_retries = 3 } = req.body;
    
    if (!batch_id || !platform) {
      return res.status(400).json({ 
        error: 'Missing required fields: batch_id and platform' 
      });
    }

    // Fetch batch data from Supabase using service role
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*, prompts(*)')
      .eq('id', batch_id)
      .single();

    if (batchError || !batch) {
      console.error('Batch fetch error:', batchError);
      return res.status(404).json({ 
        error: 'Batch not found',
        details: batchError?.message || 'Invalid API key'
      });
    }

    if (!batch.prompts || batch.prompts.length === 0) {
      return res.status(400).json({ 
        error: 'No prompts found in batch' 
      });
    }

    console.log(`Starting batch automation for ${batch.prompts.length} prompts on ${platform}`);
    
    // Update batch status to processing
    const { error: updateError } = await supabase
      .from('batches')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString(),
        platform: platform 
      })
      .eq('id', batch_id);

    if (updateError) {
      console.error('Error updating batch status:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update batch status',
        details: updateError.message 
      });
    }

    // Start automation (don't await - let it run in background)
    runBatchAutomation({
      batch_id,
      platform,
      prompts: batch.prompts,
      delay_between_prompts,
      max_retries,
      supabase
    }).then(() => {
      console.log(`Batch automation completed for ${batch_id}`);
    }).catch(error => {
      console.error(`Batch automation failed for ${batch_id}:`, error);
    });

    // Respond immediately
    res.status(200).json({ 
      message: 'Batch automation started successfully',
      batch_id: batch_id,
      platform: platform,
      prompt_count: batch.prompts.length,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error starting batch automation:', error);
    res.status(500).json({ 
      error: 'Failed to start batch automation',
      details: error.message 
    });
  }
});

// Stop batch processing
app.post('/api/stop-batch/:batch_id', async (req, res) => {
  try {
    const { batch_id } = req.params;
    
    if (!batch_id) {
      return res.status(400).json({ 
        error: 'Missing batch_id parameter' 
      });
    }
    
    // Update batch status to stopped
    const { error } = await supabase
      .from('batches')
      .update({ 
        status: 'stopped', 
        stopped_at: new Date().toISOString() 
      })
      .eq('id', batch_id);

    if (error) {
      console.error('Error stopping batch:', error);
      return res.status(500).json({ 
        error: 'Failed to stop batch',
        details: error.message 
      });
    }

    res.json({ 
      message: 'Batch stop requested',
      batch_id: batch_id 
    });

  } catch (error) {
    console.error('Error stopping batch:', error);
    res.status(500).json({ 
      error: 'Failed to stop batch',
      details: error.message 
    });
  }
});

// Get batch status and progress
app.get('/api/batch-status/:batch_id', async (req, res) => {
  try {
    const { batch_id } = req.params;
    
    if (!batch_id) {
      return res.status(400).json({ 
        error: 'Missing batch_id parameter' 
      });
    }
    
    const { data: batch, error } = await supabase
      .from('batches')
      .select(`
        *,
        prompts(id, status, result, error_message, processed_at),
        automation_logs(*)
      `)
      .eq('id', batch_id)
      .single();

    if (error || !batch) {
      console.error('Batch status fetch error:', error);
      return res.status(404).json({ 
        error: 'Batch not found',
        details: error?.message 
      });
    }

    const totalPrompts = batch.prompts?.length || 0;
    const completedPrompts = batch.prompts?.filter(p => p.status === 'completed').length || 0;
    const failedPrompts = batch.prompts?.filter(p => p.status === 'failed').length || 0;
    const processingPrompts = batch.prompts?.filter(p => p.status === 'processing').length || 0;

    res.json({
      batch_id: batch_id,
      status: batch.status,
      platform: batch.platform,
      progress: {
        total: totalPrompts,
        completed: completedPrompts,
        failed: failedPrompts,
        processing: processingPrompts,
        pending: totalPrompts - completedPrompts - failedPrompts - processingPrompts,
        percentage: totalPrompts > 0 ? Math.round((completedPrompts / totalPrompts) * 100) : 0
      },
      timestamps: {
        created_at: batch.created_at,
        started_at: batch.started_at,
        completed_at: batch.completed_at,
        stopped_at: batch.stopped_at
      },
      recent_logs: batch.automation_logs?.slice(-5) || [] // Last 5 log entries
    });
    
  } catch (error) {
    console.error('Error getting batch status:', error);
    res.status(500).json({ 
      error: 'Failed to get batch status',
      details: error.message 
    });
  }
});

// Get detailed prompt results
app.get('/api/batch-results/:batch_id', async (req, res) => {
  try {
    const { batch_id } = req.params;
    
    if (!batch_id) {
      return res.status(400).json({ 
        error: 'Missing batch_id parameter' 
      });
    }
    
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('batch_id', batch_id)
      .order('order_index');

    if (error) {
      console.error('Prompt results fetch error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch results',
        details: error.message 
      });
    }

    res.json({
      batch_id: batch_id,
      prompts: (prompts || []).map(p => ({
        id: p.id,
        order_index: p.order_index,
        prompt_text: p.prompt_text,
        status: p.status,
        result: p.result,
        error_message: p.error_message,
        processed_at: p.processed_at,
        processing_time_ms: p.processing_time_ms
      }))
    });
    
  } catch (error) {
    console.error('Error getting batch results:', error);
    res.status(500).json({ 
      error: 'Failed to get batch results',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AutoPromptr Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'Missing'}`);
  console.log(`Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
