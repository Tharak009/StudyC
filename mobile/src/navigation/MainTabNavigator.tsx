import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";
import { LayoutDashboard, Users, Mail, User } from "lucide-react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

// Screens
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { CommunityListScreen } from "../screens/communities/CommunityListScreen";
import { CommunityDetailsScreen } from "../screens/communities/CommunityDetailsScreen";
import { CommunityMembersScreen } from "../screens/communities/CommunityMembersScreen";
import { ChatScreen } from "../screens/chat/ChatScreen";
import { ResourceListScreen } from "../screens/resources/ResourceListScreen";
import { ResourceDetailsScreen } from "../screens/resources/ResourceDetailsScreen";
import { UploadResourceScreen } from "../screens/resources/UploadResourceScreen";
import { DirectMessageListScreen } from "../screens/chat/DirectMessageListScreen";
import { DirectMessageChatScreen } from "../screens/chat/DirectMessageChatScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { NotificationScreen } from "../screens/notifications/NotificationScreen";

export type CommunitiesStackParamList = {
  CommunityList: undefined;
  CommunityDetails: { communityId: string };
  CommunityMembers: { communityId: string };
  Chat: { communityId: string; name: string };
  ResourceList: { communityId: string; name: string };
  ResourceDetails: { resourceId: string };
  UploadResource: { communityId: string };
  UserProfile: { userId: string };
};

export type MessagesStackParamList = {
  DirectMessageList: undefined;
  DirectMessageChat: { conversationId: string; receiverName: string; receiverId: string };
  UserProfile: { userId: string };
};

export type ProfileStackParamList = {
  Profile: { userId?: string };
  EditProfile: undefined;
};

export type MainTabParamList = {
  DashboardStack: undefined;
  CommunitiesStack: undefined;
  MessagesStack: undefined;
  ProfileStack: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createNativeStackNavigator();
const CommunitiesStack = createNativeStackNavigator<CommunitiesStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator>
      <DashboardStack.Screen name="Dashboard" component={DashboardScreen} />
      <DashboardStack.Screen name="Notifications" component={NotificationScreen} />
      <DashboardStack.Screen name="DashboardUserProfile" component={ProfileScreen} />
    </DashboardStack.Navigator>
  );
}

function CommunitiesStackScreen() {
  return (
    <CommunitiesStack.Navigator>
      <CommunitiesStack.Screen name="CommunityList" component={CommunityListScreen} options={{ title: "Communities" }} />
      <CommunitiesStack.Screen name="CommunityDetails" component={CommunityDetailsScreen} options={{ title: "Community" }} />
      <CommunitiesStack.Screen name="CommunityMembers" component={CommunityMembersScreen} options={{ title: "Members" }} />
      <CommunitiesStack.Screen name="Chat" component={ChatScreen} />
      <CommunitiesStack.Screen name="ResourceList" component={ResourceListScreen} options={{ title: "Resources" }} />
      <CommunitiesStack.Screen name="ResourceDetails" component={ResourceDetailsScreen} options={{ title: "Resource Details" }} />
      <CommunitiesStack.Screen name="UploadResource" component={UploadResourceScreen} options={{ title: "Upload" }} />
      <CommunitiesStack.Screen name="UserProfile" component={ProfileScreen} />
    </CommunitiesStack.Navigator>
  );
}

function MessagesStackScreen() {
  return (
    <MessagesStack.Navigator>
      <MessagesStack.Screen name="DirectMessageList" component={DirectMessageListScreen} options={{ title: "Direct Messages" }} />
      <MessagesStack.Screen name="DirectMessageChat" component={DirectMessageChatScreen} />
      <MessagesStack.Screen name="UserProfile" component={ProfileScreen} />
    </MessagesStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
    </ProfileStack.Navigator>
  );
}

export function MainTabNavigator() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="DashboardStack"
        component={DashboardStackScreen}
        options={{
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CommunitiesStack"
        component={CommunitiesStackScreen}
        options={{
          tabBarLabel: "Communities",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MessagesStack"
        component={MessagesStackScreen}
        options={{
          tabBarLabel: "Messages",
          tabBarIcon: ({ color, size }) => <Mail color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
