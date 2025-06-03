import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '../store';
import { useTheme } from '../hooks/useTheme';
import { logout } from '../store/slices/authSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  title: string;
  type: 'switch' | 'button' | 'info';
  value?: boolean | string;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme, toggleTheme: toggleAppTheme } = useTheme();
  const { user } = useAppSelector((state) => state.auth);

  const [changePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const handleChangePassword = () => {
    setChangePasswordModalVisible(true);
  };

  const handleSavePassword = () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    // TODO: Implement password change API call
    Alert.alert('Success', 'Password changed successfully.');
    setChangePasswordModalVisible(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion API call
            Alert.alert(
              'Account Deleted',
              'Your account has been deleted successfully.'
            );
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Your portfolio and watchlist data will be exported to a CSV file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // TODO: Implement data export functionality
            Alert.alert(
              'Export Started',
              "Your data export has started. You will be notified when it's ready."
            );
          },
        },
      ]
    );
  };

  const settingsSections: SettingsSection[] = [
    {
      title: 'Account',
      items: [
        {
          title: 'Email',
          type: 'info',
          value: user?.email || 'Not available',
        },
        {
          title: 'Change Password',
          type: 'button',
          onPress: handleChangePassword,
        },
        {
          title: 'Export Data',
          type: 'button',
          onPress: handleExportData,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          title: 'Dark Mode',
          type: 'switch',
          value: theme.mode === 'dark',
          onToggle: toggleAppTheme,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          title: 'Push Notifications',
          type: 'switch',
          value: true,
          onToggle: (value) => {
            // TODO: Implement push notification toggle
            Alert.alert(
              'Coming Soon',
              'Notification settings will be available in a future update.'
            );
          },
        },
        {
          title: 'Price Alerts',
          type: 'switch',
          value: true,
          onToggle: (value) => {
            // TODO: Implement price alerts toggle
            Alert.alert(
              'Coming Soon',
              'Price alerts will be available in a future update.'
            );
          },
        },
        {
          title: 'Portfolio Updates',
          type: 'switch',
          value: true,
          onToggle: (value) => {
            // TODO: Implement portfolio updates toggle
            Alert.alert(
              'Coming Soon',
              'Portfolio update notifications will be available in a future update.'
            );
          },
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          title: 'Biometric Authentication',
          type: 'switch',
          value: false,
          onToggle: (value) => {
            // TODO: Implement biometric authentication
            Alert.alert(
              'Coming Soon',
              'Biometric authentication will be available in a future update.'
            );
          },
        },
        {
          title: 'Data Sharing',
          type: 'switch',
          value: false,
          onToggle: (value) => {
            // TODO: Implement data sharing toggle
            Alert.alert(
              'Coming Soon',
              'Data sharing settings will be available in a future update.'
            );
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          title: 'Help Center',
          type: 'button',
          onPress: () =>
            Alert.alert(
              'Coming Soon',
              'Help center will be available in a future update.'
            ),
        },
        {
          title: 'Contact Support',
          type: 'button',
          onPress: () =>
            Alert.alert(
              'Coming Soon',
              'Contact support will be available in a future update.'
            ),
        },
        {
          title: 'Rate App',
          type: 'button',
          onPress: () =>
            Alert.alert(
              'Coming Soon',
              'App rating will be available in a future update.'
            ),
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          title: 'Delete Account',
          type: 'button',
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];

  const renderSettingsItem = (item: SettingsItem, sectionTitle: string) => {
    switch (item.type) {
      case 'switch':
        return (
          <View style={styles.settingsItem}>
            <Text
              style={[styles.settingsItemTitle, { color: theme.colors.text }]}
            >
              {item.title}
            </Text>
            <Switch
              value={item.value as boolean}
              onValueChange={item.onToggle}
              trackColor={{
                false: theme.colors.surface,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.background}
            />
          </View>
        );
      case 'button':
        return (
          <View style={styles.settingsItem}>
            <Button
              title={item.title}
              onPress={item.onPress || (() => {})}
              style={[
                styles.settingsButton,
                sectionTitle === 'Danger Zone'
                  ? { backgroundColor: theme.colors.error }
                  : { backgroundColor: theme.colors.surface },
              ]}
              textStyle={[
                styles.settingsButtonText,
                {
                  color:
                    sectionTitle === 'Danger Zone'
                      ? theme.colors.background
                      : theme.colors.text,
                },
              ]}
            />
          </View>
        );
      case 'info':
        return (
          <View style={styles.settingsItem}>
            <Text
              style={[styles.settingsItemTitle, { color: theme.colors.text }]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.settingsItemValue,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.value as string}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer}>
        {/* User Info Card */}
        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            <View
              style={[
                styles.userAvatar,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.userAvatarText,
                  { color: theme.colors.background },
                ]}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {user?.email || 'User'}
              </Text>
              <Text
                style={[
                  styles.userStatus,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Active Member
              </Text>
            </View>
          </View>
        </Card>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <Card key={section.title} style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
            {section.items.map((item, index) => (
              <View key={index}>
                {renderSettingsItem(item, section.title)}
                {index < section.items.length - 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                )}
              </View>
            ))}
          </Card>
        ))}

        {/* Logout Button */}
        <Card style={styles.logoutCard}>
          <Button
            title='Logout'
            onPress={handleLogout}
            style={[
              styles.logoutButton,
              { backgroundColor: theme.colors.error },
            ]}
            textStyle={{ color: theme.colors.background }}
          />
        </Card>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent
        animationType='slide'
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Change Password
            </Text>

            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Current Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={passwordData.currentPassword}
                onChangeText={(text) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: text,
                  }))
                }
                secureTextEntry
                placeholder='Enter current password'
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                New Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={passwordData.newPassword}
                onChangeText={(text) =>
                  setPasswordData((prev) => ({ ...prev, newPassword: text }))
                }
                secureTextEntry
                placeholder='Enter new password'
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Confirm New Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={passwordData.confirmPassword}
                onChangeText={(text) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: text,
                  }))
                }
                secureTextEntry
                placeholder='Confirm new password'
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title='Cancel'
                onPress={() => setChangePasswordModalVisible(false)}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                textStyle={{ color: theme.colors.text }}
              />
              <Button
                title='Save'
                onPress={handleSavePassword}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userStatus: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsItemTitle: {
    fontSize: 16,
    flex: 1,
  },
  settingsItemValue: {
    fontSize: 14,
  },
  settingsButton: {
    flex: 1,
    marginLeft: 16,
  },
  settingsButtonText: {
    textAlign: 'center',
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  logoutCard: {
    marginBottom: 32,
  },
  logoutButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
