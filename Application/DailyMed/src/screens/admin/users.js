import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontFamily, Layout, Shadows } from '../../../constants/theme';
import { adminAPI } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ROLE_OPTIONS = [
  { label: 'All Roles', value: '' },
  { label: 'Patient', value: 'patient' },
  { label: 'Doctor', value: 'doctor' },
  { label: 'Caregiver', value: 'caregiver' },
];

const UsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const [showVerificationFilterDropdown, setShowVerificationFilterDropdown] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showVerificationDropdown, setShowVerificationDropdown] = useState(false);

  // Add User Form States
  const [addUsername, setAddUsername] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');
  const [addRole, setAddRole] = useState('');
  const [addIsVerified, setAddIsVerified] = useState(true);
  const [showAddRoleDropdown, setShowAddRoleDropdown] = useState(false);
  const [showVerifiedDropdown, setShowVerifiedDropdown] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Validation error messages
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    buttons: [],
  });

  // Validation
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email);
  const validateUsername = (username) => username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
  const validatePassword = (password) =>
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Get validation message
  const getPasswordStrength = (password) => {
    if (!password) return { text: '', color: '' };
    if (password.length < 8) return { text: 'Too short (min 8 characters)', color: '#F44336' };
    if (!/[a-z]/.test(password)) return { text: 'Missing lowercase letter', color: '#F44336' };
    if (!/[A-Z]/.test(password)) return { text: 'Missing uppercase letter', color: '#F44336' };
    if (!/[0-9]/.test(password)) return { text: 'Missing number', color: '#F44336' };
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { text: 'Missing special character', color: '#F44336' };
    return { text: 'Strong password ✓', color: '#4CAF50' };
  };

  const getUsernameValidation = (username) => {
    if (!username) return { text: '', color: '' };
    if (username.length < 3) return { text: 'Too short (min 3 characters)', color: '#F44336' };
    if (username.length > 20) return { text: 'Too long (max 20 characters)', color: '#F44336' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { text: 'Only letters, numbers, and underscore allowed', color: '#F44336' };
    return { text: 'Valid username ✓', color: '#4CAF50' };
  };

  const getEmailValidation = (email) => {
    if (!email) return { text: '', color: '' };
    if (!validateEmail(email)) return { text: 'Invalid email format', color: '#F44336' };
    return { text: 'Valid email ✓', color: '#4CAF50' };
  };

  const isAddFormValid =
    validateUsername(addUsername) &&
    validateEmail(addEmail) &&
    validatePassword(addPassword) &&
    addPassword === addConfirmPassword &&
    addRole;

  // Fetch Users
  const fetchUsers = useCallback(
    async (reset = true) => {
      if (loading) return;
      setLoading(true);
      try {
        const params = {
          page: reset ? 1 : page + 1,
          limit: 20,
        };
        if (search.trim()) params.search = search.trim();
        if (selectedRole) params.role = selectedRole;
        if (selectedAccountStatus) params.accountStatus = selectedAccountStatus;
        if (selectedVerification !== '') {
          params.isVerified = selectedVerification === 'verified' ? 'true' : 'false';
        }

        console.log('Fetching users with params:', params);
        const response = await adminAPI.getAllUsers(params);
        console.log('Users fetched:', response.data.length);

        setUsers(reset ? response.data : [...users, ...response.data]);
        setPage(response.pagination.currentPage);
        setHasMore(response.pagination.currentPage < response.pagination.totalPages);
      } catch (error) {
        console.error('Fetch users error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        setUsers([]); // Clear users on error
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Error',
          message: error.response?.data?.message || 'Failed to load users.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
        });
      } finally {
        setLoading(false);
      }
    },
    [page, search, selectedRole, selectedAccountStatus, selectedVerification, loading, users]
  );

  // Auto-refresh on filter changes (immediate, no debounce)
  useEffect(() => {
    if (selectedRole !== undefined || selectedAccountStatus !== undefined || selectedVerification !== undefined) {
      console.log('Filters changed, refreshing:', { selectedRole, selectedAccountStatus, selectedVerification });
      fetchUsers(true);
    }
  }, [selectedRole, selectedAccountStatus, selectedVerification]);

  // Debounced search only
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Initial load
  useEffect(() => {
    fetchUsers(true);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '#4CAF50'; // Green
      case 'warning':
        return '#FF9800'; // Yellow/Orange
      case 'suspended':
        return '#F44336'; // Red
      default:
        return '#9E9E9E';
    }
  };

  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

  // Action Handlers
  const openActionModal = (user) => {
    setSelectedUser(user);
    setShowActionModal(true);
  };

  const updateUserStatus = async (newStatus) => {
    try {
      await adminAPI.updateUserStatus(selectedUser._id, newStatus);
      setShowStatusDropdown(false);
      const updatedUsers = users.map(u => u._id === selectedUser._id ? {...u, accountStatus: newStatus} : u);
      setUsers(updatedUsers);
      setSelectedUser({...selectedUser, accountStatus: newStatus});
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Account status updated successfully',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
      });
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Failed',
        message: 'Could not update status.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
      });
    }
  };

  const updateUserVerification = async (isVerified) => {
    try {
      console.log('Updating verification for user:', selectedUser._id, 'to:', isVerified);
      const response = await adminAPI.updateUserStatus(selectedUser._id, undefined, isVerified);
      console.log('Verification update response:', response);
      setShowVerificationDropdown(false);
      const updatedUsers = users.map(u => u._id === selectedUser._id ? {...u, isVerified} : u);
      setUsers(updatedUsers);
      setSelectedUser({...selectedUser, isVerified});
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Success',
        message: `Account ${isVerified ? 'verified' : 'unverified'} successfully`,
        buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
      });
    } catch (err) {
      console.error('Verification update error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Failed',
        message: err.response?.data?.message || 'Could not update verification status.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
      });
    }
  };

  const deleteUser = () => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: 'Delete User',
      message: `Are you sure you want to delete ${selectedUser.username}? This action cannot be undone.`,
      buttons: [
        { 
          text: 'Cancel', 
          onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: async () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            try {
              await adminAPI.deleteUser(selectedUser._id);
              setShowActionModal(false);
              fetchUsers(true);
              setAlertConfig({
                visible: true,
                type: 'success',
                title: 'Success',
                message: 'User deleted successfully',
                buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
              });
            } catch (err) {
              setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Failed',
                message: 'Could not delete user.',
                buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
              });
            }
          },
          style: 'destructive'
        },
      ],
    });
  };

  const createUser = async () => {
    setAddLoading(true);
    try {
      await adminAPI.createUser({
        username: addUsername,
        email: addEmail.toLowerCase(),
        password: addPassword,
        role: addRole,
        isVerified: addIsVerified,
      });
      setShowAddModal(false);
      resetAddForm();
      fetchUsers(true);
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'User created successfully',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create user.';
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: msg,
        buttons: [{ text: 'OK', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
      });
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddForm = () => {
    setAddUsername('');
    setAddEmail('');
    setAddPassword('');
    setAddConfirmPassword('');
    setAddRole('');
    setAddIsVerified(true);
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
  };

  const openDetailModal = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getVerificationColor = (isVerified) => isVerified ? '#4CAF50' : '#FF9800';

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => openDetailModal(item)} activeOpacity={0.7}>
      <View style={styles.cardLeft}>
        <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">{item.username}</Text>
        <Text style={styles.email} numberOfLines={1} ellipsizeMode="tail">{item.email}</Text>
        <Text style={styles.roleText}>Role: {capitalize(item.role)}</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.statusColumn}>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.accountStatus) }]}>
            <Text style={styles.pillText}>{capitalize(item.accountStatus)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: getVerificationColor(item.isVerified) }]}>
            <Text style={styles.pillText}>{item.isVerified ? 'Verified' : 'Un-Verified'}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={(e) => {
            e.stopPropagation();
            openActionModal(item);
          }}
        >
          <Text style={styles.actionText}>Action</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Users</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search + Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Filter Buttons Row */}
      <View style={styles.filtersRow}>
        {/* Role Filter */}
        <View style={styles.filterWrapper}>
          <TouchableOpacity 
            style={styles.filterChip} 
            onPress={() => {
              setShowRoleDropdown(!showRoleDropdown);
              setShowStatusFilterDropdown(false);
              setShowVerificationFilterDropdown(false);
            }}
          >
            <Text style={styles.filterChipText}>
              {selectedRole ? capitalize(selectedRole) : 'Role'}
            </Text>
            <Text style={styles.filterChipIcon}>▼</Text>
          </TouchableOpacity>
          {showRoleDropdown && (
            <View style={styles.filterDropdown}>
              {ROLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.filterDropdownItem}
                  onPress={() => {
                    setSelectedRole(option.value);
                    setShowRoleDropdown(false);
                  }}
                >
                  <Text style={styles.filterDropdownText}>{option.label}</Text>
                  {selectedRole === option.value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Account Status Filter */}
        <View style={styles.filterWrapper}>
          <TouchableOpacity 
            style={styles.filterChip} 
            onPress={() => {
              setShowStatusFilterDropdown(!showStatusFilterDropdown);
              setShowRoleDropdown(false);
              setShowVerificationFilterDropdown(false);
            }}
          >
            <Text style={styles.filterChipText}>
              {selectedAccountStatus ? capitalize(selectedAccountStatus) : 'Status'}
            </Text>
            <Text style={styles.filterChipIcon}>▼</Text>
          </TouchableOpacity>
          {showStatusFilterDropdown && (
            <View style={styles.filterDropdown}>
              <TouchableOpacity
                style={styles.filterDropdownItem}
                onPress={() => {
                  setSelectedAccountStatus('');
                  setShowStatusFilterDropdown(false);
                }}
              >
                <Text style={styles.filterDropdownText}>All Status</Text>
                {selectedAccountStatus === '' && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
              {['active', 'warning', 'suspended'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.filterDropdownItem}
                  onPress={() => {
                    setSelectedAccountStatus(status);
                    setShowStatusFilterDropdown(false);
                  }}
                >
                  <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status) }]} />
                  <Text style={styles.filterDropdownText}>{capitalize(status)}</Text>
                  {selectedAccountStatus === status && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Verification Filter */}
        <View style={styles.filterWrapper}>
          <TouchableOpacity 
            style={styles.filterChip} 
            onPress={() => {
              setShowVerificationFilterDropdown(!showVerificationFilterDropdown);
              setShowRoleDropdown(false);
              setShowStatusFilterDropdown(false);
            }}
          >
            <Text style={styles.filterChipText}>
              {selectedVerification === '' ? 'Verify' : selectedVerification === 'verified' ? 'Verified' : 'Unverified'}
            </Text>
            <Text style={styles.filterChipIcon}>▼</Text>
          </TouchableOpacity>
          {showVerificationFilterDropdown && (
            <View style={styles.filterDropdown}>
              <TouchableOpacity
                style={styles.filterDropdownItem}
                onPress={() => {
                  setSelectedVerification('');
                  setShowVerificationFilterDropdown(false);
                }}
              >
                <Text style={styles.filterDropdownText}>All</Text>
                {selectedVerification === '' && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterDropdownItem}
                onPress={() => {
                  setSelectedVerification('verified');
                  setShowVerificationFilterDropdown(false);
                }}
              >
                <Text style={styles.filterDropdownText}>Verified</Text>
                {selectedVerification === 'verified' && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterDropdownItem}
                onPress={() => {
                  setSelectedVerification('unverified');
                  setShowVerificationFilterDropdown(false);
                }}
              >
                <Text style={styles.filterDropdownText}>Un-Verified</Text>
                {selectedVerification === 'unverified' && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && users.length > 0 ? <ActivityIndicator style={{ marginVertical: 20 }} color={Colors.primary} /> : null}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No users found</Text> : null}
        contentContainerStyle={users.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : styles.listContent}
      />

      {/* Add User Modal */}
      <Modal visible={showAddModal} animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput 
                style={[styles.input, addUsername && !validateUsername(addUsername) && styles.inputError]} 
                value={addUsername} 
                onChangeText={setAddUsername} 
                placeholder="Enter username"
                autoCapitalize="none"
              />
              {addUsername && (
                <Text style={[styles.validationText, { color: getUsernameValidation(addUsername).color }]}>
                  {getUsernameValidation(addUsername).text}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, addEmail && !validateEmail(addEmail) && styles.inputError]}
                value={addEmail}
                onChangeText={setAddEmail}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {addEmail && (
                <Text style={[styles.validationText, { color: getEmailValidation(addEmail).color }]}>
                  {getEmailValidation(addEmail).text}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, addPassword && !validatePassword(addPassword) && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  value={addPassword}
                  onChangeText={setAddPassword}
                  secureTextEntry={!showAddPassword}
                  placeholder="Enter password"
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowAddPassword(!showAddPassword)}>
                  <Text style={styles.eye}>👁</Text>
                </TouchableOpacity>
              </View>
              {addPassword && (
                <Text style={[styles.validationText, { color: getPasswordStrength(addPassword).color }]}>
                  {getPasswordStrength(addPassword).text}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.passwordContainer, addConfirmPassword && addPassword !== addConfirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  value={addConfirmPassword}
                  onChangeText={setAddConfirmPassword}
                  secureTextEntry={!showAddConfirmPassword}
                  placeholder="Confirm password"
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowAddConfirmPassword(!showAddConfirmPassword)}>
                  <Text style={styles.eye}>👁</Text>
                </TouchableOpacity>
              </View>
              {addConfirmPassword && (
                <Text style={[styles.validationText, { color: addPassword === addConfirmPassword ? '#4CAF50' : '#F44336' }]}>
                  {addPassword === addConfirmPassword ? 'Passwords match ✓' : 'Passwords do not match'}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowAddRoleDropdown(!showAddRoleDropdown)}>
                <Text style={[styles.dropdownText, !addRole && styles.placeholder]}>
                  {addRole ? capitalize(addRole) : 'Select role'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {showAddRoleDropdown && (
                <View style={styles.dropdownMenu}>
                  {['patient', 'doctor', 'caregiver'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setAddRole(r);
                        setShowAddRoleDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{capitalize(r)}</Text>
                      {addRole === r && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Verification</Text>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowVerifiedDropdown(!showVerifiedDropdown)}>
                <Text style={styles.dropdownText}>
                  {addIsVerified ? 'Verified' : 'Not Verified'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {showVerifiedDropdown && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setAddIsVerified(true);
                      setShowVerifiedDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Verified</Text>
                    {addIsVerified && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setAddIsVerified(false);
                      setShowVerifiedDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Not Verified</Text>
                    {!addIsVerified && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.createButton, !isAddFormValid && styles.createButtonDisabled]}
              onPress={createUser}
              disabled={!isAddFormValid || addLoading}
            >
              {addLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Create User</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal visible={showActionModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.actionModal}>
            <TouchableOpacity style={styles.actionClose} onPress={() => {
              setShowActionModal(false);
              setShowStatusDropdown(false);
              setShowVerificationDropdown(false);
            }}>
              <Text style={styles.closeIcon}>×</Text>
            </TouchableOpacity>
            
            <Text style={styles.actionTitle}>{selectedUser?.username}</Text>
            <Text style={styles.actionSubtitle}>{selectedUser?.email}</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.roleText}>{capitalize(selectedUser?.role)}</Text>
            </View>

            {/* Account Status Dropdown */}
            <View style={styles.actionInputGroup}>
              <Text style={styles.actionLabel}>Account Status</Text>
              <TouchableOpacity 
                style={styles.actionDropdownButton} 
                onPress={() => {
                  setShowStatusDropdown(!showStatusDropdown);
                  setShowVerificationDropdown(false);
                }}
              >
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedUser?.accountStatus) }]} />
                <Text style={styles.actionDropdownText}>{capitalize(selectedUser?.accountStatus)}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {showStatusDropdown && (
                <View style={styles.actionDropdownMenu}>
                  {['active', 'warning', 'suspended'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={styles.actionDropdownItem}
                      onPress={() => updateUserStatus(status)}
                    >
                      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status) }]} />
                      <Text style={styles.actionDropdownItemText}>{capitalize(status)}</Text>
                      {selectedUser?.accountStatus === status && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Verification Status Dropdown */}
            <View style={styles.actionInputGroup}>
              <Text style={styles.actionLabel}>Verification Status</Text>
              <TouchableOpacity 
                style={styles.actionDropdownButton} 
                onPress={() => {
                  setShowVerificationDropdown(!showVerificationDropdown);
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.actionDropdownText}>{selectedUser?.isVerified ? 'Verified' : 'Not Verified'}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {showVerificationDropdown && (
                <View style={styles.actionDropdownMenu}>
                  <TouchableOpacity
                    style={styles.actionDropdownItem}
                    onPress={() => updateUserVerification(true)}
                  >
                    <Text style={styles.actionDropdownItemText}>Verified</Text>
                    {selectedUser?.isVerified && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionDropdownItem}
                    onPress={() => updateUserVerification(false)}
                  >
                    <Text style={styles.actionDropdownItemText}>Not Verified</Text>
                    {!selectedUser?.isVerified && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.deleteBtn} onPress={deleteUser}>
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailModal}>
            <TouchableOpacity style={styles.detailClose} onPress={() => setShowDetailModal(false)}>
              <Text style={styles.detailCloseIcon}>×</Text>
            </TouchableOpacity>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
              <Text style={styles.detailTitle}>User Details</Text>
              
              {/* Basic Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>{selectedUser?.username || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedUser?.email || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.badgeText}>{capitalize(selectedUser?.role)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{selectedUser?.fullName || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedUser?.phone || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date of Birth</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedUser?.dateOfBirth)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>{selectedUser?.gender ? capitalize(selectedUser.gender.replace('_', ' ')) : 'N/A'}</Text>
                </View>
              </View>

              {/* Account Status */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Account Status</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedUser?.accountStatus) }]}>
                    <Text style={styles.badgeText}>{capitalize(selectedUser?.accountStatus)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Verified</Text>
                  <Text style={styles.detailValue}>{selectedUser?.isVerified ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedUser?.createdAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Login</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedUser?.lastLogin)}</Text>
                </View>
              </View>

              {/* Medical Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Medical Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Height</Text>
                  <Text style={styles.detailValue}>{selectedUser?.height ? `${selectedUser.height} cm` : 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>{selectedUser?.weight ? `${selectedUser.weight} kg` : 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Blood Type</Text>
                  <Text style={styles.detailValue}>{selectedUser?.bloodType || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Diabetes</Text>
                  <Text style={styles.detailValue}>{selectedUser?.medicalConditions?.diabetes ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hypertension</Text>
                  <Text style={styles.detailValue}>{selectedUser?.medicalConditions?.hypertension ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Medical History</Text>
                  <Text style={styles.detailValue}>{selectedUser?.medicalHistory || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Medications</Text>
                  <Text style={styles.detailValue}>{selectedUser?.currentMedications || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Allergies</Text>
                  <Text style={styles.detailValue}>{selectedUser?.allergies || 'N/A'}</Text>
                </View>
              </View>

              {/* Emergency Contact */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedUser?.emergencyContact?.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedUser?.emergencyContact?.phone || 'N/A'}</Text>
                </View>
              </View>

              {/* Notification Preferences */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Notification Preferences</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Health Alerts</Text>
                  <Text style={styles.detailValue}>{selectedUser?.notificationPreferences?.healthAlerts ? 'Enabled' : 'Disabled'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Med Reminders</Text>
                  <Text style={styles.detailValue}>{selectedUser?.notificationPreferences?.medReminders ? 'Enabled' : 'Disabled'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Appointment Reminders</Text>
                  <Text style={styles.detailValue}>{selectedUser?.notificationPreferences?.apptReminders ? 'Enabled' : 'Disabled'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Weekly Reports</Text>
                  <Text style={styles.detailValue}>{selectedUser?.notificationPreferences?.weeklyReports ? 'Enabled' : 'Disabled'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Security Alerts</Text>
                  <Text style={styles.detailValue}>{selectedUser?.notificationPreferences?.securityAlerts ? 'Enabled' : 'Disabled'}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topMargin,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  searchFilterContainer: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 50,
    ...Shadows.small,
  },
  searchIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  filterChip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.small,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
  },
  filterChipIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  filterDropdown: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    ...Shadows.medium,
    zIndex: 20,
    maxHeight: 200,
  },
  filterDropdownItem: {
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  filterDropdownText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  check: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 50,
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg, // Increased vertical padding by ~20%
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.medium,
  },
  cardLeft: {
    flex: 1,
    marginRight: Spacing.sm,
    alignItems: 'flex-start',
  },
  username: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  email: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusColumn: {
    gap: Spacing.xs,
  },
  statusPill: {
    borderRadius: 100, // Large border radius for fully rounded pills
    paddingHorizontal: Spacing.md,
    paddingVertical: 6, // Increased vertical padding for better pill shape
    minWidth: 100,
    alignItems: 'center',
  },
  pillText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  actionButton: {
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 22, // ADJUST THIS: Match height of 2 pills + gap (2*6 vertical + gap between)
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
  },
  roleBadge: {
    backgroundColor: Colors.gray300,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  // Add Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Layout.topMargin,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  closeIcon: {
    fontSize: 32,
    color: Colors.textPrimary,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eye: {
    fontSize: 22,
    paddingHorizontal: Spacing.md,
    color: Colors.textSecondary,
  },
  dropdownButton: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  placeholder: {
    color: Colors.inputPlaceholder,
  },
  dropdownArrow: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  dropdownMenu: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    ...Shadows.medium,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  checkIcon: {
    fontSize: 18,
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    ...Shadows.medium,
  },
  createButtonDisabled: {
    backgroundColor: Colors.gray300,
    opacity: 0.6,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: FontFamily.bold,
  },
  // Action Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '85%',
    maxHeight: SCREEN_HEIGHT * 0.7,
    ...Shadows.large,
  },
  actionClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
  },
  actionTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  actionRoleBadge: {
    marginBottom: Spacing.lg,
  },
  roleContainer: {
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray400,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    minWidth: 120,
  },
  roleText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  actionInputGroup: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionDropdownButton: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
  },
  actionDropdownText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  actionDropdownMenu: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    ...Shadows.medium,
  },
  actionDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionDropdownItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  deleteBtn: {
    backgroundColor: Colors.error,
    width: '100%',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  deleteText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  // Detail Modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...Shadows.large,
  },
  detailClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
  },
  detailCloseIcon: {
    fontSize: 32,
    color: Colors.textPrimary,
  },
  detailContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.xl + 20,
  },
  detailTitle: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  detailSection: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  detailLabel: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  validationText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 4,
    marginLeft: 4,
  },
  inputError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
});

export default UsersScreen;