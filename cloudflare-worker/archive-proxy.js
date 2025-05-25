/**
 * Cloudflare Worker for Archive.today Proxy
 * This worker handles archiving requests to bypass CORS restrictions
 */

export default {
  async fetch(request, env, ctx) {
    // Only allow specific origins in production
    const allowedOrigins = [
      'chrome-extension://*',
      'moz-extension://*',
      'http://localhost:*',
      'https://localhost:*'
    ];
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Restrict in production
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      
      if (!targetUrl) {
        return new Response(JSON.stringify({ 
          error: 'Missing url parameter' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate URL
      try {
        new URL(targetUrl);
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: 'Invalid URL provided' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Step 1: Get archive.today homepage to extract submitid
      const archiveDomain = 'https://archive.ph';
      const homeResponse = await fetch(archiveDomain, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const homeHtml = await homeResponse.text();
      
      // Extract submitid from the form
      const submitidMatch = homeHtml.match(/name="submitid"\s+value="([^"]+)"/);
      const submitid = submitidMatch ? submitidMatch[1] : '';
      
      if (!submitid) {
        // Try without submitid (some archive.today mirrors don't require it)
        console.log('No submitid found, attempting without it');
      }

      // Step 2: Submit the URL for archiving
      const formData = new URLSearchParams();
      formData.append('url', targetUrl);
      if (submitid) {
        formData.append('submitid', submitid);
      }

      const submitResponse = await fetch(`${archiveDomain}/submit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': archiveDomain,
          'Origin': archiveDomain
        },
        body: formData.toString(),
        redirect: 'manual' // Don't follow redirects automatically
      });

      // Handle the response
      const status = submitResponse.status;
      const location = submitResponse.headers.get('location');
      const refresh = submitResponse.headers.get('refresh');
      
      let archivedUrl = '';
      let isInProgress = false;

      if (status === 302 || status === 303 || status === 307) {
        // Redirect means archive is ready or in progress
        archivedUrl = location || '';
        
        // Check if it's a "wip" (work in progress) URL
        if (archivedUrl.includes('/wip/')) {
          isInProgress = true;
        }
      } else if (status === 200 && refresh) {
        // Extract URL from refresh header
        const refreshMatch = refresh.match(/url=(.+)/);
        if (refreshMatch) {
          archivedUrl = refreshMatch[1];
          isInProgress = archivedUrl.includes('/wip/');
        }
      }

      // If we got a work-in-progress URL, we might want to check it
      if (isInProgress && archivedUrl) {
        // Optional: Make a HEAD request to check if archiving is complete
        const checkResponse = await fetch(archivedUrl, {
          method: 'HEAD',
          redirect: 'manual'
        });
        
        if (checkResponse.status === 302) {
          const finalLocation = checkResponse.headers.get('location');
          if (finalLocation && !finalLocation.includes('/wip/')) {
            archivedUrl = finalLocation;
            isInProgress = false;
          }
        }
      }

      // Return the result
      return new Response(JSON.stringify({
        success: true,
        archivedUrl: archivedUrl,
        originalUrl: targetUrl,
        isInProgress: isInProgress,
        status: status,
        message: isInProgress 
          ? 'Archiving in progress. The URL will be available soon.' 
          : 'Archive created successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Archive proxy error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Failed to archive URL',
        details: error.toString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};