// Assuming current implementation is written as follows:

const fetchPendingApprovals = async () => {
    try {
        const response = await fetch('/api/profiles'); // Fetch function might vary
        const users = await response.json();

        // Filter users with status 'pending' or 'pending_approval'
        const pendingUsers = users.filter(user => 
           user.status === 'pending' || user.status === 'pending_approval'
        );
        // Update state or UI with pendingUsers here
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
    }
};