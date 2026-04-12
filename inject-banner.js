// inject-banner.js
const fs = require('fs');
let c = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const banner = [
  '',
  '      {/* بانر للناخب: نتائج القائمة العامة غير متاحة بعد */}',
  '      {!isAdmin && !isGeneralResultsPublished && (',
  '        <div className="rounded-3xl border border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50 p-6 flex items-center gap-5 shadow-sm">',
  '          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">',
  '            <ShieldCheck className="w-7 h-7 text-amber-600" />',
  '          </div>',
  '          <div className="flex-1 text-right">',
  '            <h3 className="text-lg font-black text-amber-900">\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u0628\u0639\u062f</h3>',
  '            <p className="text-sm text-amber-700 mt-1">\u0633\u064a\u062a\u0645 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0639\u0646 \u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0648\u0637\u0646\u064a\u0629 \u0648\u0627\u0644\u0623\u062d\u0632\u0627\u0628 \u0628\u0639\u062f \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u062a\u0635\u0648\u064a\u062a \u0648\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0635\u0646\u0627\u062f\u064a\u0642 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0629 \u0631\u0633\u0645\u064a\u0627\u064b.</p>',
  '            <p className="text-xs text-amber-600 font-bold mt-1">\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629: {generalStatus}</p>',
  '          </div>',
  '          <button onClick={() => setView(\'local\')} className="shrink-0 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-all shadow-md">\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u062f\u0648\u0627\u0626\u0631 \u0627\u0644\u0645\u062d\u0644\u064a\u0629</button>',
  '        </div>',
  '      )}',
  '',
  '      {/* View Toggle */}',
].join('\n');

c = c.replace('{/* View Toggle */}', banner);
fs.writeFileSync('src/pages/Results.tsx', c, 'utf8');
console.log('Done - banner injected');
