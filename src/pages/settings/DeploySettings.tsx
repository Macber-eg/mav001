import { useState } from 'react';
import { Globe, Loader2, CheckCircle, AlertCircle, Share2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

function DeploySettings() {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  
  const { user } = useAuthStore();
  
  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployStatus('deploying');
    setDeployError(null);
    
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'netlify',
          siteTitle: `Mavrika EVE - ${user?.user_metadata?.company_name || 'Enterprise Virtual Employees'}`,
          includeFunctions: true, // Include Netlify Functions in deployment
          functionsDir: 'netlify/functions' // Specify the functions directory
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start deployment');
      }
      
      const deployData = await response.json();
      
      if (deployData.deploy_id) {
        let status = 'deploying';
        let deployUrl = null;
        let claimUrl = null;
        let claimed = false;
        
        while (status === 'deploying') {
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const statusResponse = await fetch(`/api/deploy-status?deploy_id=${deployData.deploy_id}`);
          
          if (!statusResponse.ok) {
            throw new Error('Failed to check deployment status');
          }
          
          const statusData = await statusResponse.json();
          status = statusData.status;
          
          if (status === 'success') {
            deployUrl = statusData.deploy_url;
            claimUrl = statusData.claim_url;
            claimed = statusData.claimed || false;
          }
        }
        
        if (status === 'success') {
          setDeployStatus('success');
          setDeployUrl(deployUrl);
          setClaimUrl(claimUrl);
          setIsClaimed(claimed);
        } else {
          throw new Error(`Deployment failed with status: ${status}`);
        }
      } else {
        throw new Error('No deployment ID returned');
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeployStatus('error');
      setDeployError(error.message || 'Failed to deploy application');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-secondary">Deployment Settings</h2>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-start mb-6">
          <div className="h-10 w-10 rounded-full bg-neon-green text-black flex items-center justify-center mr-4">
            <Globe size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">Deploy to Netlify</h3>
            <p className="text-gray-600">
              Deploy your Mavrika EVE™ platform to Netlify to make it accessible on the web.
              This allows your team to access your virtual employees from anywhere.
            </p>
          </div>
        </div>
        
        {deployStatus === 'idle' && (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Deploy Your Application</h4>
            <p className="text-sm text-gray-600 mb-4">
              Your Mavrika EVE™ platform will be deployed to Netlify with the following configuration:
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center">
                <span className="font-medium text-sm w-32">Site Name:</span>
                <span className="text-sm">{`mavrika-eve-${user?.user_metadata?.company_name?.toLowerCase().replace(/\s+/g, '-') || 'platform'}`}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-sm w-32">Build Command:</span>
                <span className="text-sm font-mono">npm run build</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-sm w-32">Publish Directory:</span>
                <span className="text-sm font-mono">dist</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-sm w-32">Functions Directory:</span>
                <span className="text-sm font-mono">netlify/functions</span>
              </div>
            </div>
            
            <button
              onClick={handleDeploy}
              className="px-4 py-2 bg-black text-neon-green hover:bg-black/90 rounded font-medium border border-neon-green"
            >
              <Share2 size={16} className="inline mr-2" />
              Deploy to Netlify
            </button>
          </div>
        )}
        
        {deployStatus === 'deploying' && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
            <div className="flex items-center mb-2">
              <Loader2 size={20} className="text-blue-600 animate-spin mr-2" />
              <h4 className="font-medium text-blue-800">Deploying Your Application</h4>
            </div>
            <p className="text-sm text-blue-600">
              Your application is being deployed to Netlify. This may take a few minutes.
              Please don't close this window until the deployment is complete.
            </p>
          </div>
        )}
        
        {deployStatus === 'success' && (
          <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
            <div className="flex items-center mb-2">
              <CheckCircle size={20} className="text-green-600 mr-2" />
              <h4 className="font-medium text-green-800">Deployment Successful!</h4>
            </div>
            
            <p className="text-sm text-green-700 mb-4">
              Your Mavrika EVE™ platform has been successfully deployed to Netlify.
              {isClaimed ? ' A new site URL has been generated below.' : ''}
            </p>
            
            {deployUrl && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Application URL:
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={deployUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 focus:outline-none"
                  />
                  <a
                    href={deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-neon-green text-black rounded-r-md hover:bg-neon-green/90 flex items-center"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}
            
            {claimUrl && !isClaimed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Claim Your Site on Netlify:
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Use this link to transfer the Netlify site to your own Netlify account.
                </p>
                <div className="flex">
                  <input
                    type="text"
                    value={claimUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 focus:outline-none"
                  />
                  <a
                    href={claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-black text-neon-green rounded-r-md hover:bg-black/90 flex items-center border border-neon-green"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
        
        {deployStatus === 'error' && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
            <div className="flex items-center mb-2">
              <AlertCircle size={20} className="text-red-600 mr-2" />
              <h4 className="font-medium text-red-800">Deployment Failed</h4>
            </div>
            <p className="text-sm text-red-700 mb-2">
              Sorry, we encountered an error while deploying your application.
            </p>
            {deployError && (
              <div className="text-xs bg-red-100 p-2 rounded font-mono text-red-800 mb-4">
                {deployError}
              </div>
            )}
            <button
              onClick={handleDeploy}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded font-medium"
            >
              Try Again
            </button>
          </div>
        )}
        
        <div className="mt-6 border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-2">About Deployment</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Deploying to Netlify offers several benefits:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your EVE™ platform from anywhere with an internet connection</li>
              <li>Share your virtual employees with team members</li>
              <li>Automatic SSL certificate for secure connections</li>
              <li>Fast global CDN for optimal performance</li>
              <li>Serverless functions for AI capabilities</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">Environment Variables</h3>
        <p className="text-gray-600 mb-4">
          After deployment, you'll need to configure your environment variables in the Netlify dashboard.
          Make sure to set the following variables:
        </p>
        
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Variable Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm font-mono">OPENAI_API_KEY</td>
                  <td className="px-4 py-2 text-sm">Your OpenAI API key for AI functionality</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-mono">SUPABASE_URL</td>
                  <td className="px-4 py-2 text-sm">Your Supabase project URL</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-mono">SUPABASE_SERVICE_ROLE_KEY</td>
                  <td className="px-4 py-2 text-sm">Supabase service role key for backend functions</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-mono">VITE_SUPABASE_URL</td>
                  <td className="px-4 py-2 text-sm">Same as SUPABASE_URL (for frontend)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-mono">VITE_SUPABASE_ANON_KEY</td>
                  <td className="px-4 py-2 text-sm">Supabase anonymous key for client-side access</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          You can set these variables in the Netlify dashboard under Site settings &gt; Build & deploy &gt; Environment.
        </p>
      </div>
    </div>
  );
}

export default DeploySettings;