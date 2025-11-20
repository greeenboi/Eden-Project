import { StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { Terminal } from 'lucide-react-native';
import { View } from '@/components/Themed';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function TabOneScreen() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text className="text-3xl font-bold mb-6">UI Components</Text>
      
      {/* Alert */}
      <Alert icon={Terminal} className="mb-4">
        <AlertTitle>Welcome!</AlertTitle>
        <AlertDescription>
          This page showcases various shadcn UI components.
        </AlertDescription>
      </Alert>

      {/* Card with Buttons */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles and variants</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Button>
            <Text>Default Button</Text>
          </Button>
          <Button variant="secondary">
            <Text>Secondary</Text>
          </Button>
          <Button variant="destructive">
            <Text>Destructive</Text>
          </Button>
          <Button variant="outline">
            <Text>Outline</Text>
          </Button>
          <Button variant="ghost">
            <Text>Ghost</Text>
          </Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Status indicators and labels</CardDescription>
        </CardHeader>
        <CardContent className="flex-row gap-2 flex-wrap">
          <Badge>
            <Text>Default</Text>
          </Badge>
          <Badge variant="secondary">
            <Text>Secondary</Text>
          </Badge>
          <Badge variant="destructive">
            <Text>Destructive</Text>
          </Badge>
          <Badge variant="outline">
            <Text>Outline</Text>
          </Badge>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
          <CardDescription>Input fields and switches</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <View style={{backgroundColor:"transparent"}} className="gap-2">
            <Label nativeID="email">Email</Label>
            <Input
              placeholder="Enter your email"
              value={inputValue}
              onChangeText={setInputValue}
              aria-labelledby="email"
            />
          </View>
          
          <Separator />
          
          <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between">
            <Label nativeID="notifications">Enable Notifications</Label>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              aria-labelledby="notifications"
            />
          </View>
        </CardContent>
        <CardFooter>
          <Button className="w-full">
            <Text>Submit</Text>
          </Button>
        </CardFooter>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
});
