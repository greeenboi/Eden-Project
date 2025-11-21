import { View } from '@/components/Themed';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useSession } from '@/lib/ctx';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Info,
  LogOut,
  Mail,
  Shield,
  User
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

export default function AccountScreen() {
  const { signOut, user } = useSession();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const accountSections = [
    {
      title: 'Profile Information',
      items: [
        { icon: User, label: 'Name', value: user?.name || 'User' },
        { icon: Mail, label: 'Email', value: user?.email || '' },
        { icon: Shield, label: 'Role', value: user?.role || 'user' },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between p-4">
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeft size={24} />
        </Button>
        <Text className="text-xl font-bold">Account</Text>
        <View style={{backgroundColor:"transparent"}} className="w-10" />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Header */}
        <Card className="mb-4">
          <CardContent className="items-center py-6">
            <Avatar alt={user?.name || 'User'} className="w-24 h-24 mb-4">
              <AvatarFallback>
                <Text className="text-3xl">
                  {user?.name ? getInitials(user.name) : 'U'}
                </Text>
              </AvatarFallback>
            </Avatar>
            <Text className="text-2xl font-bold mb-1">{user?.name}</Text>
            <Text className="text-base opacity-70">{user?.email}</Text>
          </CardContent>
        </Card>

        {/* Account Information */}
        {accountSections.map((section, index) => (
          <Card key={index} className="mb-4">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={{backgroundColor:"transparent"}}>
                  <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3 py-2">
                    <item.icon size={20} className="opacity-70" />
                    <View style={{backgroundColor:"transparent"}} className="flex-1">
                      <Text className="text-sm opacity-70 mb-1">{item.label}</Text>
                      <Text className="text-base font-medium">{item.value}</Text>
                    </View>
                  </View>
                  {itemIndex < section.items.length - 1 && <Separator />}
                </View>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Quick Actions */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>More</CardTitle>
          </CardHeader>
          <CardContent>
            <Pressable onPress={() => router.push('/credits')}>
              <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between py-3">
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3">
                  <Info size={20} className="opacity-70" />
                  <Text className="text-base">Credits & About</Text>
                </View>
                <Text className="opacity-50">→</Text>
              </View>
            </Pressable>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button variant="destructive" onPress={signOut} className="mb-8">
          <LogOut size={20} />
          <Text className="ml-2">Sign Out</Text>
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
});
