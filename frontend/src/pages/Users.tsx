import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/client'
import { UserPlus, Copy, Check, AlertCircle, X, Wallet } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  created_at: string
  balance_usd?: number
}

export default function Users() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'client' })
  const [createdUser, setCreatedUser] = useState<{ email: string; temporary_password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  
  // Balance modal states
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [balanceSuccess, setBalanceSuccess] = useState<{ old: number; new: number; amount: number } | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await adminApi.getClients()
      return res.data.clients as User[]
    }
  })

  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: string }) =>
      adminApi.createUser(data),
    onSuccess: (response) => {
      setCreatedUser({
        email: response.data.email,
        temporary_password: response.data.temporary_password
      })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewUser({ email: '', name: '', role: 'client' })
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create user')
    }
  })

  const addBalanceMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason?: string }) =>
      adminApi.addUserBalance(userId, amount, reason),
    onSuccess: (response) => {
      setBalanceSuccess({
        old: response.data.old_balance,
        new: response.data.new_balance,
        amount: response.data.added_amount
      })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setBalanceAmount('')
      setBalanceReason('')
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to add balance')
    }
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createUserMutation.mutate(newUser)
  }

  const copyPassword = () => {
    if (createdUser?.temporary_password) {
      navigator.clipboard.writeText(createdUser.temporary_password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setCreatedUser(null)
    setError('')
    setNewUser({ email: '', name: '', role: 'client' })
  }

  const openBalanceModal = (user: User) => {
    setSelectedUser(user)
    setIsBalanceModalOpen(true)
    setBalanceSuccess(null)
    setError('')
  }

  const closeBalanceModal = () => {
    setIsBalanceModalOpen(false)
    setSelectedUser(null)
    setBalanceAmount('')
    setBalanceReason('')
    setBalanceSuccess(null)
    setError('')
  }

  const handleAddBalance = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    if (selectedUser) {
      addBalanceMutation.mutate({
        userId: selectedUser.id,
        amount,
        reason: balanceReason || undefined
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 mt-1">Manage platform users</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Email</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Name</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Role</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Balance</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Created</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : users?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              users?.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-white">{user.email}</td>
                  <td className="px-6 py-4 text-gray-300">{user.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-500/20 text-purple-300' 
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'active' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-mono font-medium ${
                      (user.balance_usd || 0) > 0 ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      ${(user.balance_usd || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openBalanceModal(user)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm transition-colors"
                    >
                      <Wallet className="w-4 h-4" />
                      Add Balance
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            {!createdUser ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Add New User</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Role
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createUserMutation.isPending}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">User Created!</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Save this temporary password - it won't be shown again!
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-400 mb-1">Email</div>
                  <div className="text-white font-medium">{createdUser.email}</div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-400 mb-1">Temporary Password</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-green-400 font-mono bg-slate-800 px-3 py-2 rounded">
                      {createdUser.temporary_password}
                    </code>
                    <button
                      onClick={copyPassword}
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded transition-colors"
                      title="Copy password"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Balance Modal */}
      {isBalanceModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            {!balanceSuccess ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Add Balance</h2>
                  <button onClick={closeBalanceModal} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-sm text-gray-400">User</div>
                  <div className="text-white font-medium">{selectedUser.email}</div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleAddBalance} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Amount (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      placeholder="10.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Reason (optional)
                    </label>
                    <input
                      type="text"
                      value={balanceReason}
                      onChange={(e) => setBalanceReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      placeholder="Bonus, refund, etc."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeBalanceModal}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addBalanceMutation.isPending}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      {addBalanceMutation.isPending ? 'Adding...' : 'Add Balance'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Balance Added!</h2>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 flex justify-between">
                    <span className="text-gray-400">Previous Balance</span>
                    <span className="text-white">${balanceSuccess.old.toFixed(2)}</span>
                  </div>
                  <div className="bg-green-600/20 rounded-lg p-4 flex justify-between">
                    <span className="text-green-300">Added Amount</span>
                    <span className="text-green-400 font-medium">+${balanceSuccess.amount.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 flex justify-between">
                    <span className="text-gray-400">New Balance</span>
                    <span className="text-white font-bold">${balanceSuccess.new.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={closeBalanceModal}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
