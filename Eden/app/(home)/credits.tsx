import { View } from '@/components/Themed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import {
    ArrowLeft,
    Code,
    Heart,
    Mail,
    Music
} from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

export default function CreditsScreen() {
  const developers = [
    { name: 'Suvan Gowrishanker', role: 'Lead Developer', email: 'suvan@example.com' },
  ];

  const technologies = [
    { name: 'React Native', description: 'Mobile framework' },
    { name: 'Expo', description: 'Development platform' },
    { name: 'TypeScript', description: 'Type-safe JavaScript' },
    { name: 'Zustand', description: 'State management' },
    { name: 'Cloudflare Workers', description: 'Backend API' },
    { name: 'Drizzle ORM', description: 'Database ORM' },
    { name: 'Hono', description: 'Web framework' },
  ];

  const licenses = [
    { name: 'shadcn/ui', license: 'MIT' },
    { name: 'Lucide Icons', license: 'ISC' },
    { name: 'NativeWind', license: 'MIT' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between p-4">
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeft size={24} />
        </Button>
        <Text className="text-xl font-bold">Credits</Text>
        <View style={{backgroundColor:"transparent"}} className="w-10" />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* App Info */}
        <Card className="mb-4">
          <CardContent className="items-center py-8">
            <View style={{backgroundColor:"transparent"}} className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center mb-4">
              <Music size={40} className="text-primary" />
            </View>
            <Text className="text-2xl font-bold mb-2">Eden Music</Text>
            <Badge>
              <Text>Version 1.0.0</Text>
            </Badge>
            <Text className="text-center opacity-70 mt-4">
              A beautiful music streaming app built with modern technologies
            </Text>
          </CardContent>
        </Card>

        {/* Developers */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex-row items-center gap-2">
              <Code size={20} />
              <Text>Developers</Text>
            </CardTitle>
            <CardDescription>Built with ❤️ by</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {developers.map((dev, index) => (
              <View key={index} style={{backgroundColor:"transparent"}}>
                <View style={{backgroundColor:"transparent"}} className="py-2">
                  <Text className="text-base font-semibold mb-1">{dev.name}</Text>
                  <Text className="text-sm opacity-70 mb-1">{dev.role}</Text>
                  <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
                    <Mail size={14} className="opacity-50" />
                    <Text className="text-sm opacity-70">{dev.email}</Text>
                  </View>
                </View>
                {index < developers.length - 1 && <Separator />}
              </View>
            ))}
          </CardContent>
        </Card>

        {/* Technologies */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Technologies Used</CardTitle>
            <CardDescription>Powered by amazing open-source tools</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            {technologies.map((tech, index) => (
              <View key={index} style={{backgroundColor:"transparent"}} className="py-2">
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between">
                  <View style={{backgroundColor:"transparent"}}>
                    <Text className="text-base font-medium">{tech.name}</Text>
                    <Text className="text-sm opacity-70">{tech.description}</Text>
                  </View>
                </View>
                {index < technologies.length - 1 && <Separator className="mt-2" />}
              </View>
            ))}
          </CardContent>
        </Card>

        {/* Open Source Licenses */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Open Source Licenses</CardTitle>
            <CardDescription>Third-party software licenses</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            {licenses.map((item, index) => (
              <View key={index} style={{backgroundColor:"transparent"}} className="py-2">
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between">
                  <Text className="text-base">{item.name}</Text>
                  <Badge variant="outline">
                    <Text>{item.license}</Text>
                  </Badge>
                </View>
                {index < licenses.length - 1 && <Separator className="mt-2" />}
              </View>
            ))}
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="mb-8">
          <CardContent className="py-6 items-center">
            <Heart size={24} className="text-destructive mb-2" />
            <Text className="text-center opacity-70">
              Made with passion for music lovers
            </Text>
            <Text className="text-sm opacity-50 mt-2">
              © 2025 Eden Music. All rights reserved.
            </Text>
          </CardContent>
        </Card>
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
