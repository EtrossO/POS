
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { BrainCircuit, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Sale, PromoRule } from '../types';

interface GeminiInsightsProps {
  sales: Sale[];
  promos: PromoRule[];
  basePrice: number;
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ sales, promos, basePrice }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Re-initializing Gemini client right before use as per best practices
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const salesDataSummary = sales.map(s => ({
        qty: s.quantity,
        price: s.totalPrice,
        method: s.paymentMethod,
        date: new Date(s.timestamp).toLocaleDateString()
      }));

      const prompt = `Analyze this sales data for my "Kacang Parpu" business.
      Current base price: RM ${basePrice}.
      Current promos: ${promos.map(p => `${p.quantity}pcs for RM${p.price}`).join(', ')}.
      Recent Sales (JSON): ${JSON.stringify(salesDataSummary.slice(0, 20))}.
      
      Please provide:
      1. A brief executive summary of performance.
      2. Recommendation for new/better promos to increase "Average Order Value".
      3. Trend analysis (Cash vs QR).
      Keep it professional, concise, and formatted in clean Markdown with bullet points.`;

      // Upgraded to gemini-3-pro-preview for complex reasoning tasks like business analysis
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setInsight(response.text || 'Unable to generate insights at this time.');
    } catch (error) {
      console.error("Gemini Error:", error);
      setInsight("Error connecting to AI. Please ensure you have a valid internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="bg-orange-500 p-4 rounded-2xl shadow-lg shadow-orange-500/20">
            <BrainCircuit size={48} className="text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black">AI Business Consultant</h2>
          <p className="text-slate-400 max-w-lg text-lg leading-relaxed">
            Let Gemini analyze your sales patterns and suggest the most effective promotional strategies for your Kacang Parpu business.
          </p>
          <button
            onClick={generateInsights}
            disabled={loading || sales.length === 0}
            className="group relative bg-white text-slate-900 font-black py-4 px-10 rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="text-orange-500 group-hover:animate-pulse" />}
            {loading ? 'Analyzing Data...' : 'Generate Smart Insights'}
          </button>
          
          {sales.length === 0 && (
            <p className="text-red-400 text-sm font-bold">Add some sales first to enable analysis!</p>
          )}
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
      </div>

      {insight && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-2 mb-6 text-slate-400">
            <MessageSquare size={18} />
            <span className="text-xs font-black uppercase tracking-widest">AI Analysis Result</span>
          </div>
          <div className="prose prose-slate max-w-none whitespace-pre-wrap font-medium text-slate-700 leading-relaxed">
            {insight}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiInsights;
