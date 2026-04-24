import { Tabs } from 'expo-router'
import { Brain, Crown, UserCircle, ShoppingCart } from 'phosphor-react-native'
import { colors } from '../../src/constants/theme'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#16103a',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Play',
          tabBarIcon: ({ color, size }) => <Brain weight="duotone" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size }) => <Crown weight="duotone" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <UserCircle weight="duotone" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <ShoppingCart weight="duotone" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
