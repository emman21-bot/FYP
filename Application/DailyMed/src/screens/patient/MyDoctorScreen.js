import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    
    Modal,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { careRelationshipAPI } from '../../services/careRelationshipAPI';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../../constants/theme';
import CustomAlert from '../../components/CustomAlert';
import CustomDrawer from '../../components/CustomDrawer';

const MyDoctorScreen = ({ navigation }) => {
    const [relationships, setRelationships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [tab, setTab] = useState('active'); // 'active' or 'pending'
    
    // CustomAlert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        type: 'error',
        title: '',
        message: '',
        buttons: []
    });

    useFocusEffect(
        useCallback(() => {
            fetchRelationships();
        }, [])
    );

    const fetchRelationships = async () => {
        try {
            setLoading(true);
            const data = await careRelationshipAPI.getCareRelationships();
            setRelationships(data.data || data || []);
        } catch (error) {
            console.error('Error fetching relationships:', error);
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'Failed to load your doctor relationships',
                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRelationships();
        setRefreshing(false);
    };

    const handleCancelRequest = async (relationshipId) => {
        setAlertConfig({
            type: 'warning',
            title: 'Cancel Request',
            message: 'Are you sure you want to cancel this doctor request?',
            buttons: [
                { text: 'No', style: 'secondary', onPress: () => setAlertVisible(false) },
                {
                    text: 'Yes, Cancel',
                    style: 'primary',
                    onPress: async () => {
                        setAlertVisible(false);
                        try {
                            await careRelationshipAPI.terminateCareRelationship(relationshipId, 'Cancelled by patient');
                            setAlertConfig({
                                type: 'success',
                                title: 'Success',
                                message: 'Request cancelled successfully',
                                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                            fetchRelationships();
                        } catch (error) {
                            console.error('Error cancelling request:', error);
                            setAlertConfig({
                                type: 'error',
                                title: 'Error',
                                message: 'Failed to cancel request',
                                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                        }
                    },
                },
            ]
        });
        setAlertVisible(true);
    };

    const handleEndRelationship = async (relationshipId, doctorName) => {
        setAlertConfig({
            type: 'warning',
            title: 'End Relationship',
            message: `Are you sure you want to end your care relationship with Dr. ${doctorName}? This action cannot be undone.`,
            buttons: [
                { text: 'Cancel', style: 'secondary', onPress: () => setAlertVisible(false) },
                {
                    text: 'End Relationship',
                    style: 'primary',
                    onPress: async () => {
                        setAlertVisible(false);
                        try {
                            await careRelationshipAPI.terminateCareRelationship(relationshipId, 'Ended by patient');
                            setAlertConfig({
                                type: 'success',
                                title: 'Success',
                                message: 'Care relationship has been ended',
                                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                            setModalVisible(false);
                            fetchRelationships();
                        } catch (error) {
                            console.error('Error ending relationship:', error);
                            setAlertConfig({
                                type: 'error',
                                title: 'Error',
                                message: 'Failed to end relationship',
                                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                            });
                            setAlertVisible(true);
                        }
                    },
                },
            ]
        });
        setAlertVisible(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const activeRelationships = relationships.filter((r) => r.status === 'active');
    const pendingRelationships = relationships.filter((r) => r.status === 'requested');

    const renderDoctorCard = ({ item }) => (
        <TouchableOpacity
            style={styles.doctorCard}
            onPress={() => {
                setSelectedDoctor(item);
                setTimeout(() => setModalVisible(true), 100);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {item.doctorName?.charAt(0)?.toUpperCase() || 'D'}
                    </Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.doctorName}>Dr. {item.doctorName}</Text>
                    <Text style={styles.doctorEmail}>{item.doctorEmail}</Text>
                    <Text style={styles.relationshipDate}>
                        Connected: {formatDate(item.approvedAt)}
                    </Text>
                </View>
                <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderPendingCard = ({ item }) => (
        <View style={styles.pendingCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.avatarContainer, styles.pendingAvatar]}>
                    <Text style={styles.avatarText}>
                        {item.doctorName?.charAt(0)?.toUpperCase() || 'D'}
                    </Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.doctorName}>Dr. {item.doctorName}</Text>
                    <Text style={styles.doctorEmail}>{item.doctorEmail}</Text>
                    <Text style={styles.requestDate}>
                        Requested: {formatDate(item.requestedAt)}
                    </Text>
                </View>
                <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={20} color="#3498DB" />
                    <Text style={styles.pendingText}>Pending</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelRequest(item._id)}
            >
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
        </View>
    );

    const renderDoctorDetailsModal = () => {
        if (!selectedDoctor) return null;

        return (
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Doctor Details</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.profileSection}>
                                <View style={styles.largeAvatar}>
                                    <Text style={styles.largeAvatarText}>
                                        {selectedDoctor.doctorName?.charAt(0)?.toUpperCase() || 'D'}
                                    </Text>
                                </View>
                                <Text style={styles.modalDoctorName}>Dr. {selectedDoctor.doctorName}</Text>
                                <Text style={styles.modalDoctorEmail}>{selectedDoctor.doctorEmail}</Text>
                            </View>

                            <View style={styles.infoSection}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="calendar" size={20} color="#3498DB" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Connected Since</Text>
                                        <Text style={styles.infoValue}>{formatDate(selectedDoctor.approvedAt)}</Text>
                                    </View>
                                </View>

                                {selectedDoctor.notes && (
                                    <View style={styles.infoRow}>
                                        <Ionicons name="document-text" size={20} color="#3498DB" />
                                        <View style={styles.infoContent}>
                                            <Text style={styles.infoLabel}>Doctor's Notes</Text>
                                            <Text style={styles.infoValue}>{selectedDoctor.notes}</Text>
                                        </View>
                                    </View>
                                )}

                                <View style={styles.infoRow}>
                                    <Ionicons name="shield-checkmark" size={20} color="#3498DB" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Status</Text>
                                        <Text style={[styles.infoValue, styles.activeStatus]}>Active</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.consentSection}>
                                <Text style={styles.sectionTitle}>Access Permissions</Text>
                                <View style={styles.consentList}>
                                    <View style={styles.consentItem}>
                                        <Ionicons
                                            name={selectedDoctor.consentScopes?.viewHealthData ? 'checkmark-circle' : 'close-circle'}
                                            size={20}
                                            color={selectedDoctor.consentScopes?.viewHealthData ? '#27AE60' : '#E74C3C'}
                                        />
                                        <Text style={styles.consentText}>View Health Data</Text>
                                    </View>
                                    <View style={styles.consentItem}>
                                        <Ionicons
                                            name={selectedDoctor.consentScopes?.viewPredictions ? 'checkmark-circle' : 'close-circle'}
                                            size={20}
                                            color={selectedDoctor.consentScopes?.viewPredictions ? '#27AE60' : '#E74C3C'}
                                        />
                                        <Text style={styles.consentText}>View AI Predictions</Text>
                                    </View>
                                    <View style={styles.consentItem}>
                                        <Ionicons
                                            name={selectedDoctor.consentScopes?.manageDosage ? 'checkmark-circle' : 'close-circle'}
                                            size={20}
                                            color={selectedDoctor.consentScopes?.manageDosage ? '#27AE60' : '#E74C3C'}
                                        />
                                        <Text style={styles.consentText}>Manage Dosage Suggestions</Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.endRelationshipButton}
                                onPress={() => handleEndRelationship(selectedDoctor._id, selectedDoctor.doctorName)}
                            >
                                <Ionicons name="person-remove" size={20} color="#fff" />
                                <Text style={styles.endRelationshipText}>End Relationship</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const [drawerVisible, setDrawerVisible] = useState(false);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <CustomDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                navigation={navigation}
                currentScreen="MyDoctor"
            />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setDrawerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Feather name="menu" size={24} color={"#3498DB"} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>My Doctor</Text>
                        <Text style={styles.subtitle}>Connected healthcare providers</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('FindDoctor')}
                    style={styles.findButton}
                >
                    <Ionicons name="add" size={24} color="#3498DB" />
                </TouchableOpacity>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'active' && styles.activeTab]}
                    onPress={() => setTab('active')}
                >
                    <Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>
                        Active ({activeRelationships.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'pending' && styles.activeTab]}
                    onPress={() => setTab('pending')}
                >
                    <Text style={[styles.tabText, tab === 'pending' && styles.activeTabText]}>
                        Pending ({pendingRelationships.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3498DB" />
                </View>
            ) : tab === 'active' ? (
                activeRelationships.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="doctor" size={80} color="#ccc" />
                        <Text style={styles.emptyTitle}>No Connected Doctors</Text>
                        <Text style={styles.emptyText}>
                            Find a doctor to connect with and manage your health together
                        </Text>
                        <TouchableOpacity
                            style={styles.findDoctorButton}
                            onPress={() => navigation.navigate('FindDoctor')}
                        >
                            <Text style={styles.findDoctorButtonText}>Find a Doctor</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={activeRelationships}
                        renderItem={renderDoctorCard}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#3498DB']}
                            />
                        }
                    />
                )
            ) : pendingRelationships.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="time-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Pending Requests</Text>
                    <Text style={styles.emptyText}>
                        Your doctor requests will appear here while they are being reviewed
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={pendingRelationships}
                    renderItem={renderPendingCard}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#3498DB']}
                        />
                    }
                />
            )}

            {renderDoctorDetailsModal()}
            
            <CustomAlert
                visible={alertVisible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onClose={() => setAlertVisible(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: Colors.background,
      marginTop: 1,
    //   backgroundColor: '#F8F9FA',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    menuButton: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 25,
        fontWeight: 'bold',
        color: Colors.textDark,
        fontFamily: 'Montserrat',
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        fontFamily: 'Montserrat',
        marginTop: 2,
    },
    findButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#3498DB',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#999',
    },
    activeTabText: {
        color: '#3498DB',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    findDoctorButton: {
        backgroundColor: '#3498DB',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
    },
    findDoctorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    doctorCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pendingCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#3498DB',
        borderStyle: 'dashed',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3498DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    pendingAvatar: {
        backgroundColor: '#3498DB',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    cardInfo: {
        flex: 1,
    },
    doctorName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    doctorEmail: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    relationshipDate: {
        fontSize: 12,
        color: '#999',
    },
    requestDate: {
        fontSize: 12,
        color: '#3498DB',
    },
    statusBadge: {
        marginLeft: 8,
    },
    pendingBadge: {
        alignItems: 'center',
    },
    pendingText: {
        fontSize: 11,
        color: '#3498DB',
        fontWeight: '600',
        marginTop: 2,
    },
    cancelButton: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#3498DB',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    modalBody: {
        padding: 20,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    largeAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3498DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    largeAvatarText: {
        fontSize: 36,
        fontWeight: '700',
        color: '#fff',
    },
    modalDoctorName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    modalDoctorEmail: {
        fontSize: 15,
        color: '#666',
    },
    infoSection: {
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F8F9FA',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    infoContent: {
        marginLeft: 14,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    activeStatus: {
        color: '#27AE60',
    },
    consentSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
    },
    consentList: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 14,
    },
    consentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    consentText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#333',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    endRelationshipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E74C3C',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    endRelationshipText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default MyDoctorScreen;
