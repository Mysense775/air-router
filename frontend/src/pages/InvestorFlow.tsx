import { useState } from 'react';
import { 
  Key, 
  Users, 
  RefreshCw, 
  Share2, 
  DollarSign, 
  Calculator,
  ArrowRight,
  CheckCircle,
  Gift
} from 'lucide-react';

const EarningsCalculator = () => {
  const [cycles, setCycles] = useState(8);
  const [amountPerCycle, setAmountPerCycle] = useState(100);
  const [referrals, setReferrals] = useState(0);
  const [quickBonus, setQuickBonus] = useState(true);

  const turnover = cycles * amountPerCycle;
  const baseCommission = turnover * 0.005; // 0.5%
  const bonusPerRefill = quickBonus ? 5 : 3;
  const totalBonuses = cycles * bonusPerRefill;
  const referralBonus = referrals * (turnover * 0.005 * 0.5); // 0.25% from referrals
  const totalEarnings = baseCommission + totalBonuses + referralBonus;

  return (
    <div className="bg-white rounded-[20px] border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calculator className="w-4 h-4" />
        Калькулятор дохода
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Количество циклов в месяц: {cycles}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={cycles}
            onChange={(e) => setCycles(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Сумма за цикл: ${amountPerCycle}
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="50"
            value={amountPerCycle}
            onChange={(e) => setAmountPerCycle(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Активных рефералов: {referrals}
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={referrals}
            onChange={(e) => setReferrals(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="quickBonus"
            checked={quickBonus}
            onChange={(e) => setQuickBonus(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="quickBonus" className="text-sm text-gray-700">
            Быстрое пополнение (6ч → $5 бонус)
          </label>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Оборот:</span>
              <span className="font-medium">${turnover}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Базовая комиссия (0.5%):</span>
              <span className="font-medium">${baseCommission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Бонусы за пополнение:</span>
              <span className="font-medium">${totalBonuses.toFixed(2)}</span>
            </div>
            {referrals > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Реферальный бонус:</span>
                <span className="font-medium">${referralBonus.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
              <span className="text-gray-900">Итого за месяц:</span>
              <span className="text-blue-600">${totalEarnings.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvestFlowStep = ({ 
  number, 
  title, 
  description, 
  icon: Icon, 
  formula,
  children 
}: {
  number: number;
  title: string;
  description: string;
  icon: any;
  formula?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex gap-4 mb-8">
    <div className="flex-shrink-0">
      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
        {number}
      </div>
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600" />
        {title}
      </h3>
      <p className="text-gray-600 mb-3">{description}</p>
      {formula && (
        <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-3 mb-3">
          <code className="text-blue-800 text-sm">{formula}</code>
        </div>
      )}
      {children}
    </div>
  </div>
);

export default function InvestorFlow() {
  const scenarios = [
    { name: 'Минимум', cycles: 8, amount: 100, referrals: 0, quickBonus: false },
    { name: 'Стандарт', cycles: 8, amount: 100, referrals: 0, quickBonus: true },
    { name: '+4 реферала', cycles: 12, amount: 100, referrals: 4, quickBonus: true },
    { name: 'Максимум', cycles: 16, amount: 200, referrals: 10, quickBonus: true },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Как зарабатывать с инвесторских ключей
        </h1>
        <p className="text-gray-600">
          Полное руководство по инвесторской программе
        </p>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-[20px] border border-gray-200 p-6 mb-8">
        <InvestFlowStep
          number={1}
          title="Добавьте ключ"
          description="Регистрируетесь как инвестор, добавьте OpenRouter API ключ с балансом от $100."
          icon={Key}
        />

        <InvestFlowStep
          number={2}
          title="Клиенты используют ключ"
          description="Клиенты отправляют запросы через ваш ключ. Каждый запрос расходует средства."
          icon={Users}
          formula="$100 оборота = $0.50 ваш доход (0.5%)"
        />

        <InvestFlowStep
          number={3}
          title="Пополняйте ключ"
          description="Минимум 8 оборотов в месяц. Бонусы за каждое пополнение:"
          icon={RefreshCw}
        >
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="bg-green-50 border border-green-200 rounded-[20px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800">Быстрый бонус</span>
              </div>
              <p className="text-2xl font-bold text-green-600">$5</p>
              <p className="text-sm text-green-700">Пополнение в течение 6 часов</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-800">Обычный бонус</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">$3</p>
              <p className="text-sm text-blue-700">Пополнение в течение 48 часов</p>
            </div>
          </div>
        </InvestFlowStep>

        <InvestFlowStep
          number={4}
          title="Приглашайте рефералов"
          description="Делитесь ссылкой. Получайте +0.5% когда рефералы используют ваш ключ."
          icon={Share2}
          formula="Ваш реферал → +0.5% к доходу за его запросы"
        />
      </div>

      {/* Calculator */}
      <EarningsCalculator />

      {/* Scenarios Table */}
      <div className="bg-white rounded-[20px] border border-gray-200 p-6 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Примеры сценариев
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Сценарий</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Циклов</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">0.5%</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Бонусы</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Итого</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario, index) => {
                const turnover = scenario.cycles * scenario.amount;
                const commission = turnover * 0.005;
                const bonuses = scenario.cycles * (scenario.quickBonus ? 5 : 3);
                const referralEarnings = scenario.referrals * (turnover * 0.005 * 0.5);
                const total = commission + bonuses + referralEarnings;
                
                return (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">{scenario.name}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{scenario.cycles}</td>
                    <td className="text-center py-3 px-4 text-gray-600">${commission.toFixed(2)}</td>
                    <td className="text-center py-3 px-4 text-gray-600">${bonuses.toFixed(2)}</td>
                    <td className="text-right py-3 px-4 font-bold text-blue-600">${total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <a
          href="/investor/dashboard"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-[20px] font-medium hover:bg-blue-700 transition-colors"
        >
          Перейти в инвесторский кабинет
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
