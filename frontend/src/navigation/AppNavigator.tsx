// Main navigation structure for the app

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import LeadsListScreen from '../screens/leads/LeadsListScreen';
import LeadDetailScreen from '../screens/leads/LeadDetailScreen';
import AddLeadScreen from '../screens/leads/AddLeadScreen';
import EditLeadScreen from '../screens/leads/EditLeadScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import LoadingScreen from '../screens/LoadingScreen';

// Navigation types
import { 
  AuthStackParamList, 
  MainTabParamList, 
  LeadsStackParamList,
  TasksStackParamList,
  ProfileStackParamList,
  CalendarStackParamList,
  SearchStackParamList
} from '../types';

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
      headerStyle: { backgroundColor: '#2196F3' },
      headerTintColor: '#fff',
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
const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Main tab navigator
const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarStyle: { backgroundColor: '#fff' },
      tabBarActiveTintColor: '#2196F3',
      tabBarInactiveTintColor: '#666',
      headerStyle: { backgroundColor: '#2196F3' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Tab.Screen
      name="Leads"
      component={LeadsStackNavigator}
      options={{
        headerShown: false,
        tabBarLabel: 'Leads',
        // tabBarIcon: ({ color, size }) => (
        //   <Icon name="people" color={color} size={size} />
        // ),
      }}
    />
    <Tab.Screen
      name="Tasks"
      component={TasksScreen}
      options={{
        title: 'My Tasks',
        tabBarLabel: 'Tasks',
        // tabBarIcon: ({ color, size }) => (
        //   <Icon name="list" color={color} size={size} />
        // ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        tabBarLabel: 'Profile',
        // tabBarIcon: ({ color, size }) => (
        //   <Icon name="person" color={color} size={size} />
        // ),
      }}
    />
  </Tab.Navigator>
);

// Main app navigator
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;