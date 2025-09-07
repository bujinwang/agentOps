import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Import lead screens
import LeadsListScreen from '../screens/leads/LeadsListScreen';
import LeadDetailScreen from '../screens/leads/LeadDetailScreen';
import AddLeadScreen from '../screens/leads/AddLeadScreen';
import EditLeadScreen from '../screens/leads/EditLeadScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import LoadingScreen from '../screens/LoadingScreen';

// Import types
import { 
  AuthStackParamList, 
  MainTabParamList, 
  LeadsStackParamList,
  TasksStackParamList,
  ProfileStackParamList,
  CalendarStackParamList,
  SearchStackParamList
} from '../types';

// Import icon component
import { NavigationIcon } from '../components/MaterialIcon';
import { MaterialColors } from '../styles/MaterialDesign';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const LeadsStack = createNativeStackNavigator<LeadsStackParamList>();
const TasksStack = createNativeStackNavigator<TasksStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();

// Leads stack navigator
const LeadsStackNavigator = () => (
  <LeadsStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: MaterialColors.primary[500] },
      headerTintColor: MaterialColors.onPrimary,
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <LeadsStack.Screen 
      name="LeadsList" 
      component={LeadsListScreen} 
      options={{ title: 'My Leads' }}
    />
    <LeadsStack.Screen 
      name="LeadDetail" 
      component={LeadDetailScreen} 
      options={{ title: 'Lead Details' }}
    />
    <LeadsStack.Screen 
      name="AddLead" 
      component={AddLeadScreen} 
      options={{ title: 'Add New Lead' }}
    />
    <LeadsStack.Screen 
      name="EditLead" 
      component={EditLeadScreen} 
      options={{ title: 'Edit Lead' }}
    />
  </LeadsStack.Navigator>
);

// Auth stack navigator
const AuthNavigator = () => {
  console.log('AuthNavigator: Rendering AuthNavigator component');
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f5f5f5' }, // Restored original background
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Main tab navigator with vector icons
const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarStyle: { 
        backgroundColor: MaterialColors.surface,
        borderTopColor: MaterialColors.neutral[200],
        borderTopWidth: 1,
        height: 80,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: MaterialColors.primary[500],
      tabBarInactiveTintColor: MaterialColors.neutral[500],
      headerStyle: { backgroundColor: MaterialColors.primary[500] },
      headerTintColor: MaterialColors.onPrimary,
      headerTitleStyle: { fontWeight: 'bold' },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
      },
    }}
  >
    <Tab.Screen
      name="Leads"
      component={LeadsStackNavigator}
      options={{
        headerShown: false,
        tabBarLabel: 'Leads',
        tabBarIcon: ({ color, focused }) => (
          <NavigationIcon
            name="leads"
            color={color}
            state={focused ? 'active' : 'default'}
            size="navigation"
          />
        ),
      }}
    />
    <Tab.Screen
      name="Tasks"
      component={TasksScreen}
      options={{
        title: 'My Tasks',
        tabBarLabel: 'Tasks',
        tabBarIcon: ({ color, focused }) => (
          <NavigationIcon
            name="tasks"
            color={color}
            state={focused ? 'active' : 'default'}
            size="navigation"
          />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, focused }) => (
          <NavigationIcon
            name="profile"
            color={color}
            state={focused ? 'active' : 'default'}
            size="navigation"
          />
        ),
      }}
    />
  </Tab.Navigator>
);

// Main app navigator
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('AppNavigator: Rendering with state', {
    isAuthenticated,
    isLoading,
    timestamp: new Date().toISOString()
  });

  if (isLoading) {
    console.log('AppNavigator: Showing loading screen');
    return <LoadingScreen />;
  }

  const navigator = isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
  console.log('AppNavigator: Showing', isAuthenticated ? 'MainNavigator' : 'AuthNavigator');
  return navigator;
};

export default AppNavigator;