import './App.css'
import Login from './components/Login'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import AdminDashboard from './components/AdminDashboard'
import AdminTime from './components/AdminTime'
import { TimeProvider } from './components/TimeContext'
import AdminProblems from './components/AdminProblems'
import AddProblem from './components/AddProblem'
import Lobby from './components/Lobby'
import Arena from './components/Arena'
import AdminMonitoring from './components/AdminMonitoring'
import AdminStandings from './components/AdminStandings'

function ProtectedRoute({children, requiredRole}){
  const stored = localStorage.getItem('currentUser')
  if(!stored){
    return <Navigate to='/login'/>
  }

  const user = JSON.parse(stored)

  if(user.role != requiredRole){
    return <Navigate to='/login'/>
  }

  return children
}

const AdminRoute = ({children}) => (
  <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
)

const router = createBrowserRouter([
  {path:'/login', element:<Login/>},
  {path:'/', element:<Navigate to='/login'/>},
  {path:'/lobby', element:<ProtectedRoute requiredRole={"student"}><Lobby/></ProtectedRoute>},
  {path:'/arena', element:<ProtectedRoute requiredRole={"student"}><Arena/></ProtectedRoute>},
  {path:'/admin/dashboard', element:<AdminRoute><AdminDashboard/></AdminRoute>},
  {path:'/admin/addtime', element:<AdminRoute><AdminTime/></AdminRoute>},
  {path:'/admin/problems', element:<AdminRoute><AdminProblems/></AdminRoute>},
  {path:'/admin/monitoring', element:<AdminRoute><AdminMonitoring/></AdminRoute>},
  {path:'/admin/standings', element:<AdminRoute><AdminStandings/></AdminRoute>},
  {path:'/addproblem', element:<AdminRoute><AddProblem/></AdminRoute>},
  {path:'*', element:<Login/>}
])

function App() {

  return (
    <>
    <TimeProvider>
      <RouterProvider router={router}/>
    </TimeProvider>
    </>
  )
}

export default App
